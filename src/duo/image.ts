// Getting the day's image: the encrypted file from Dropbox's content host
// (which lets a page read it), opened with the key from Duo's address. The
// encrypted file is kept on the phone for when it is offline, and opened
// again with the key each time.

import { dropboxFetchUrl } from '../lib/duoLink'
import { decryptWeatherImage, WeatherImageKeyError } from '../lib/weatherImageCrypto'
import { loadLastImage, saveLastImage } from './store'
import { signature } from './signature'

export type ImageResult =
  /** Just received. `url` is an object URL; `sig` tells one sent image from another (see signature). */
  | { kind: 'fresh'; url: string; at: number; sig: string }
  /** Dropbox could not be reached: the last image received, if any. */
  | { kind: 'offline'; url: string; at: number; sig: string }
  /** Dropbox could not be reached and nothing was kept. */
  | { kind: 'nothing' }
  /** Dropbox says the file is not there any more: the share was stopped. */
  | { kind: 'gone' }
  /** The file is there but this key does not open it: a newer code was made. */
  | { kind: 'wrongKey' }

/** Statuses for a shared link whose file was removed (the share stopped). */
const GONE = new Set([404, 409, 410])

async function opened(file: ArrayBuffer, key: string): Promise<string> {
  return URL.createObjectURL(await decryptWeatherImage(file, key))
}

async function lastKept(link: string, key: string): Promise<ImageResult> {
  const last = await loadLastImage(link)
  if (!last) return { kind: 'nothing' }
  try {
    const file = await last.blob.arrayBuffer()
    return { kind: 'offline', url: await opened(file, key), at: last.at, sig: signature(file) }
  } catch {
    return { kind: 'nothing' }
  }
}

export async function fetchImage(link: string, key: string, now = Date.now()): Promise<ImageResult> {
  let res: Response
  try {
    res = await fetch(dropboxFetchUrl(link), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    return lastKept(link, key)
  }
  if (GONE.has(res.status)) return { kind: 'gone' }
  if (!res.ok) return lastKept(link, key)
  const file = await res.arrayBuffer()
  try {
    const url = await opened(file, key)
    await saveLastImage(link, new Blob([file]), now)
    return { kind: 'fresh', url, at: now, sig: signature(file) }
  } catch (e) {
    if (e instanceof WeatherImageKeyError) return { kind: 'wrongKey' }
    throw e
  }
}
