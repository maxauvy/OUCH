// The day's weather image for a relative, kept at Dropbox: turning it on and
// off, sending a new image, and the trip to Dropbox to allow the link. The
// image itself is made by `WeatherShareSender` (it needs the page to draw
// the card) or by the share sheet.

import type { DailyEntry, WeatherShareState } from '../db/types'
import { getSettings, updateSettings } from '../db'
import { dropboxWeatherImage, WEATHER_SHARE_SCOPE, weatherShareFailureOf, type WeatherShareFailure } from './cloud/dropboxWeatherImage'
import { cleanReturnAddress, finishDropboxLink, forgetPendingDropboxLink, getDropboxToken, startDropboxLink } from './cloud/dropboxLink'

const image = () => dropboxWeatherImage(getDropboxToken)

/** What an image is made from, as far as it shows: a new key means a new image to send. */
export function weatherImageKey(entry: DailyEntry, extra: { displayName?: string; language: string; look: string }): string {
  return [entry.date, entry.updatedAt, extra.displayName ?? '', extra.language, extra.look].join('|')
}

const NOW_EVENT = 'ouch:weathershare-now'
let nowRequested = false

/** Asks the sender for the image now rather than after the quiet time (turned on, permission given). */
export function requestWeatherImageNow(): void {
  nowRequested = true
  window.dispatchEvent(new Event(NOW_EVENT))
}

/** For the sender: whether the image was asked for now, said once. */
export function takeNowRequest(): boolean {
  const asked = nowRequested
  nowRequested = false
  return asked
}

export function onWeatherImageNow(listener: () => void): () => void {
  window.addEventListener(NOW_EVENT, listener)
  return () => window.removeEventListener(NOW_EVENT, listener)
}

/** After a failed try, the next one waits this long (ms), except after a new permission. */
export const RETRY_AFTER_MS = 5 * 60 * 1000

async function patch(change: Partial<WeatherShareState>): Promise<void> {
  const current = (await getSettings()).weatherShare
  // Turned off in the meantime: nothing to write back.
  if (current) await updateSettings({ weatherShare: { ...current, ...change } })
}

let sending: Promise<'sent' | WeatherShareFailure> | null = null
let waiting: ((result: 'sent' | WeatherShareFailure) => void)[] = []

/** How the next send ends (`network` if none ends within `timeoutMs`). */
export function nextSendResult(timeoutMs = 30_000): Promise<'sent' | WeatherShareFailure> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiting = waiting.filter((w) => w !== done)
      resolve('network')
    }, timeoutMs)
    const done = (result: 'sent' | WeatherShareFailure) => {
      clearTimeout(timer)
      resolve(result)
    }
    waiting.push(done)
  })
}

/** Sends the image (and makes its link the first time). One at a time. */
export function sendWeatherImage(png: Blob, key: string): Promise<'sent' | WeatherShareFailure> {
  sending ??= (async () => {
    let result: 'sent' | WeatherShareFailure = 'other'
    try {
      if (!(await getSettings()).weatherShare) return result
      await image().upload(png)
      const link = (await getSettings()).weatherShare?.link ?? (await image().link())
      await patch({ link, sentKey: key, sentAt: Date.now(), triedAt: Date.now(), lastFailure: undefined })
      result = 'sent'
    } catch (e) {
      result = weatherShareFailureOf(e)
      await patch({ triedAt: Date.now(), lastFailure: result })
    } finally {
      sending = null
      const told = waiting
      waiting = []
      for (const w of told) w(result)
    }
    return result
  })()
  return sending
}

/** Turns it on and asks for the first image now. */
export async function turnOnWeatherShare(): Promise<void> {
  if (!(await getSettings()).weatherShare) await updateSettings({ weatherShare: {} })
  requestWeatherImageNow()
}

/** Removes the image, which ends its link, then forgets it. Stays on if Dropbox can't be reached. */
export async function turnOffWeatherShare(): Promise<'off' | WeatherShareFailure> {
  try {
    await image().remove()
  } catch (e) {
    // The image would stay reachable: stay on, and say why.
    return weatherShareFailureOf(e)
  }
  await updateSettings({ weatherShare: undefined })
  return 'off'
}

/** Sends the person to Dropbox to allow the link (the backup's permissions stay). */
export function askWeatherSharePermission(): Promise<void> {
  return startDropboxLink({ purpose: 'weather', scope: WEATHER_SHARE_SCOPE })
}

/** How the trip to Dropbox for the link ended, said once in the share sheet. */
export type WeatherShareNotice = 'ready' | 'denied' | 'failed'
const NOTICE_KEY = 'ouch:weathershare-notice'

/** Back from Dropbox after `askWeatherSharePermission`: keeps the new tokens and lets the image go again. */
export async function finishWeatherSharePermission(back: { code: string; state: string } | { denied: true }): Promise<WeatherShareNotice> {
  cleanReturnAddress()
  let notice: WeatherShareNotice
  if ('denied' in back) {
    forgetPendingDropboxLink()
    notice = 'denied'
  } else if (await finishDropboxLink(back.code, back.state)) {
    // A fresh try right away: the sender sees an image not sent yet, and no failure to wait for.
    await patch({ sentKey: undefined, lastFailure: undefined, triedAt: undefined })
    requestWeatherImageNow()
    notice = 'ready'
  } else {
    notice = 'failed'
  }
  try {
    sessionStorage.setItem(NOTICE_KEY, notice)
  } catch {
    // The sheet will not say it; its status line shows how things are anyway.
  }
  return notice
}

export function takeWeatherShareNotice(): WeatherShareNotice | null {
  try {
    const v = sessionStorage.getItem(NOTICE_KEY)
    sessionStorage.removeItem(NOTICE_KEY)
    return v === 'ready' || v === 'denied' || v === 'failed' ? v : null
  } catch {
    return null
  }
}
