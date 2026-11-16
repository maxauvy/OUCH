// After the person taps "reload" for a new version, the page that comes back says the update is done, once. The tap leaves a note in the tab's session
// storage and the new page reads it and throws it away: nothing is kept, nothing is sent, and a silent update of the service worker says nothing.

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const KEY = 'ouch:justUpdated'

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
