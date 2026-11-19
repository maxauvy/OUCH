// The address a relative opens to follow someone's weather in OUCH Duo: the
// Duo app's own address, with the Dropbox link to the day's image, the key
// that opens it (lib/weatherImageCrypto.ts) and the person's first name after
// the `#`. What follows `#` never leaves the phone: GitHub Pages, which serves
// Duo, does not see it, and Dropbox only ever gets the encrypted file.
//
// Used by OUCH (to make the code and the link) and by Duo (to read them back).
// No DOM, no storage: tested in tests/duoLink.test.ts.

import { isWeatherImageKey } from './weatherImageCrypto.ts'

/** What Duo needs to show someone's weather. */
export interface DuoTarget {
  /** The Dropbox shared link to the encrypted image (`raw=1`). */
  link: string
  /** The key that opens it. */
  key: string
  /** The first name the person gave OUCH, if any. */
  name?: string
}

const DROPBOX_HOSTS = new Set(['www.dropbox.com', 'dropbox.com', 'dl.dropboxusercontent.com'])
/** A first name never needs more than this; longer is cut. */
const NAME_MAX = 40

/**
 * A Dropbox shared link to a file, in the form that serves the image itself
 * (www.dropbox.com, `raw=1`), or null for anything else. Only Dropbox shared
 * links are accepted, so Duo can never be made to show an image from
 * somewhere else.
 */
export function dropboxImageLink(text: string): string | null {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || !DROPBOX_HOSTS.has(url.hostname) || url.username || url.password) return null
  if (!/^\/(scl\/fi|s)\/[^/]+\/[^/]+/.test(url.pathname)) return null
  url.hostname = 'www.dropbox.com'
  url.port = ''
  url.hash = ''
  url.searchParams.delete('dl')
  url.searchParams.set('raw', '1')
  return url.toString()
}

/**
 * The same file at Dropbox's content host, which answers a page's fetch()
 * directly (no redirect through www.dropbox.com). Duo tries this first and
 * keeps the image for when the phone is offline; if Dropbox refuses, it shows
 * `link` in a plain <img> instead.
 */
export function dropboxFetchUrl(link: string): string {
  const url = new URL(link)
  url.hostname = 'dl.dropboxusercontent.com'
  url.searchParams.delete('raw')
  url.searchParams.delete('dl')
  return url.toString()
}

function cleanName(name: string | null | undefined): string | undefined {
  const clean = (name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
  return clean || undefined
}

/** The address to give a relative: `duoBase` (Duo's own address, ending in `/`) with the link, the key and the name after `#`. */
export function duoUrl(duoBase: string, target: DuoTarget): string {
  const params = new URLSearchParams({ l: target.link, k: target.key })
  const name = cleanName(target.name)
  if (name) params.set('n', name)
  return `${duoBase}#${params.toString()}`
}

/** Reads what follows `#` in a Duo address; null when it does not hold a Dropbox link and a key. */
export function readDuoHash(hash: string): DuoTarget | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const link = dropboxImageLink(params.get('l') ?? '')
  const key = params.get('k')
  if (!link || !isWeatherImageKey(key)) return null
  const name = cleanName(params.get('n'))
  return name ? { link, key, name } : { link, key }
}

/**
 * What a person pastes or scans into Duo: a whole Duo address (from OUCH's
 * code or message). A bare Dropbox link is not enough any more: without the
 * key, the image cannot be opened. Null for anything else.
 */
export function readDuoInput(text: string): DuoTarget | null {
  const trimmed = text.trim()
  const hashAt = trimmed.indexOf('#')
  return hashAt >= 0 ? readDuoHash(trimmed.slice(hashAt)) : null
}
