// What Duo remembers on this phone: whose weather it shows (the link, its key
// and the name), whether the install hint was put aside, and the last image
// received, still encrypted, for when the phone is offline. Nothing else, and
// nothing leaves the phone.

import { dropboxImageLink, readDuoHash, type DuoTarget } from '../lib/duoLink'
import { isWeatherImageKey } from '../lib/weatherImageCrypto'

const TARGET_KEY = 'ouch-duo:target'
const INSTALL_LATER_KEY = 'ouch-duo:install-later'
const IMAGE_CACHE = 'ouch-duo-image'
const IMAGE_KEY = 'last-image'
const IMAGE_AT_HEADER = 'x-ouch-duo-at'
const IMAGE_LINK_HEADER = 'x-ouch-duo-link'

export function loadTarget(): DuoTarget | null {
  try {
    const raw = localStorage.getItem(TARGET_KEY)
    if (!raw) return null
    const found = JSON.parse(raw) as Partial<DuoTarget>
    const link = dropboxImageLink(found.link ?? '')
    if (!link || !isWeatherImageKey(found.key)) return null
    const key = found.key
    return typeof found.name === 'string' && found.name ? { link, key, name: found.name } : { link, key }
  } catch {
    return null
  }
}

export function saveTarget(target: DuoTarget): void {
  try {
    localStorage.setItem(TARGET_KEY, JSON.stringify(target))
  } catch {
    // Private browsing: the address after # still holds it for this visit.
  }
}

/**
 * Whose weather to show when the app opens.
 *
 * A code just scanned with the phone's camera opens Duo in the browser, with
 * the link after `#`: that one wins, it is the newest. Opened from the home
 * screen, the address is the one the app was installed from, which may be an
 * older code: what this phone remembers wins. On iPhone the installed app
 * does not see what Safari remembered, so when it remembers nothing, the
 * address it was installed from is used (the manifest has no start_url, so
 * the installed app opens the very address it was added from).
 */
export function initialTarget(hash: string, standalone: boolean): DuoTarget | null {
  const fromHash = readDuoHash(hash)
  const kept = loadTarget()
  const chosen = standalone ? (kept ?? fromHash) : (fromHash ?? kept)
  if (chosen && chosen !== kept) saveTarget(chosen)
  return chosen
}

export function installLater(): boolean {
  try {
    return localStorage.getItem(INSTALL_LATER_KEY) === '1'
  } catch {
    return false
  }
}

export function setInstallLater(): void {
  try {
    localStorage.setItem(INSTALL_LATER_KEY, '1')
  } catch {
    // Not remembered: the hint comes back next time, which is harmless.
  }
}

/** The last file received from `link` (encrypted, as Dropbox gave it), and when; null when there is none (or it came from another link). */
export async function loadLastImage(link: string): Promise<{ blob: Blob; at: number } | null> {
  try {
    const cache = await caches.open(IMAGE_CACHE)
    const res = await cache.match(IMAGE_KEY)
    if (!res || res.headers.get(IMAGE_LINK_HEADER) !== link) return null
    return { blob: await res.blob(), at: Number(res.headers.get(IMAGE_AT_HEADER)) || 0 }
  } catch {
    return null
  }
}

export async function saveLastImage(link: string, blob: Blob, at: number): Promise<void> {
  try {
    const cache = await caches.open(IMAGE_CACHE)
    await cache.put(IMAGE_KEY, new Response(blob, { headers: { 'content-type': blob.type, [IMAGE_AT_HEADER]: String(at), [IMAGE_LINK_HEADER]: link } }))
  } catch {
    // Not kept: offline, the app will just have nothing to show.
  }
}

