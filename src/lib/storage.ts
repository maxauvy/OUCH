// The journal lives in IndexedDB, which the browser may clear on its own when
// the device runs low on space (Safari also does it after a week without
// use, for a site that is not installed). "Persistent" storage asks the
// browser not to. Browsers decide by their own rules: Chrome and Safari
// grant it silently (installed app, regular use), Firefox asks the person.

/** null when the browser cannot say or cannot grant it. */
export type StorageProtection = boolean | null

export async function isStorageProtected(): Promise<StorageProtection> {
  try {
    if (!navigator.storage?.persisted) return null
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}

export function canProtectStorage(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.persist === 'function'
}

/** Ask the browser to keep the data. Already protected: nothing is asked
 * again, so this is cheap to call at every launch. */
export async function requestStorageProtection(): Promise<StorageProtection> {
  try {
    if (!canProtectStorage()) return null
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}
