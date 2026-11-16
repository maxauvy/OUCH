// The page says the update is done, once, in two cases:
// - the person tapped "reload" for a new build: the tap leaves a note in the tab's session storage, and the page that comes back reads it and throws it away
//   (it also says it for a new build of the same version, a commit between two releases);
// - the version number is not the one this device saw last: a new release came in, by that tap or by itself (a silent update of the service worker).
//   The version last seen is one short string kept on the device; nothing else is kept, nothing is sent, and it is not in the backups.

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const KEY = 'ouch:justUpdated'
const SEEN_KEY = 'ouch:lastSeenVersion'

function sessionStore(): Store | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    return undefined
  }
}

/** Just before the reload that brings the new version. */
export function markUpdated(store: Store | undefined = sessionStore()): void {
  try {
    store?.setItem(KEY, '1')
  } catch {
    // Storage blocked: the page just says nothing.
  }
}

/** On the page that comes back: whether the person just updated. Reading it takes nothing away (React may read twice); `forgetUpdated` does, once it is on screen. */
export function justUpdated(store: Store | undefined = sessionStore()): boolean {
  try {
    return store?.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Said once: the note is thrown away as soon as the pill is shown. */
export function forgetUpdated(store: Store | undefined = sessionStore()): void {
  try {
    store?.removeItem(KEY)
  } catch {
    // Nothing to do.
  }
}

function localStore(): Store | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** The version this device saw last, or null when it never remembered one (a new install, cleared data, storage refused). */
export function lastSeenVersion(store: Store | undefined = localStore()): string | null {
  try {
    const seen = store?.getItem(SEEN_KEY)
    return seen && seen.length <= 40 ? seen : null
  } catch {
    return null
  }
}

/** A release the device has not seen yet. The first time (nothing remembered) is not a change: there is nothing to compare with, so it says nothing. */
export function versionChanged(current: string, store: Store | undefined = localStore()): boolean {
  const seen = lastSeenVersion(store)
  return seen !== null && seen !== current
}

/** Remember this version, once the page is on screen. With storage refused it just stays silent (it cannot compare), rather than repeating itself. */
export function rememberVersion(version: string, store: Store | undefined = localStore()): void {
  try {
    store?.setItem(SEEN_KEY, version)
  } catch {
    // Storage blocked: nothing to remember it with.
  }
}
