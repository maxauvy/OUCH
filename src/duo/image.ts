// Getting the day's image from Dropbox.
//
// First a fetch() from Dropbox's content host: when it works, the image is
// kept on the phone for when it is offline. If Dropbox does not let the page
// read it (or the network fails while the phone says it is online), the
// image is shown straight from the shared link in a plain <img>, which
// always works but cannot be kept.

import { dropboxFetchUrl } from '../lib/duoLink'
import { loadLastImage, saveLastImage } from './store'

export type ImageResult =
  /** Just received, and kept. `url` is an object URL. */
  | { kind: 'fresh'; url: string; at: number }
  /** To show from the shared link itself; `kept` is the last image received, for if that fails too. */
  | { kind: 'direct'; url: string; kept: { url: string; at: number } | null }
  /** No network: the last image received. */
  | { kind: 'offline'; url: string; at: number }
  /** No network and nothing kept. */
  | { kind: 'nothing' }
  /** Dropbox says the file is not there any more: the share was stopped. */
  | { kind: 'gone' }

/** Statuses for a shared link whose file was removed (the share stopped). */
const GONE = new Set([404, 409, 410])

async function kept(link: string): Promise<{ url: string; at: number } | null> {
  const last = await loadLastImage(link)
  return last ? { url: URL.createObjectURL(last.blob), at: last.at } : null
}

export async function fetchImage(link: string, now = Date.now()): Promise<ImageResult> {
  let res: Response
  try {
    res = await fetch(dropboxFetchUrl(link), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    const last = await kept(link)
    if (!navigator.onLine) return last ? { kind: 'offline', ...last } : { kind: 'nothing' }
    return { kind: 'direct', url: directUrl(link, now), kept: last }
  }
  if (GONE.has(res.status)) return { kind: 'gone' }
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !type.startsWith('image/')) {
    return { kind: 'direct', url: directUrl(link, now), kept: await kept(link) }
  }
  const blob = await res.blob()
  await saveLastImage(link, blob, now)
  return { kind: 'fresh', url: URL.createObjectURL(blob), at: now }
}

/** The shared link with a marker of the moment, so the browser asks Dropbox again rather than showing its own copy. */
function directUrl(link: string, now: number): string {
  const url = new URL(link)
  url.searchParams.set('t', String(now))
  return url.toString()
}
