// Where the device keeps the code lock: `localStorage`, because the app must
// know whether to show the lock before it draws anything (the journal's own
// database is read later, and a flash of the journal would defeat the lock).
// Not in the journal's database, so it is never part of a backup, an export or
// a restore: a new device starts without a code.

import { parseLock, type PinLock } from './pinLock.ts'

const KEY = 'ouch:pin-lock'

/** The lock, or null when none is set (or what was kept is unusable). Synchronous. */
export function loadLock(): PinLock | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? null : parseLock(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Returns false when it could not be kept (storage refused), so the screen can say so. */
export function saveLock(lock: PinLock): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(lock))
    return true
  } catch {
    return false
  }
}

export function clearLock(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing kept, nothing to remove.
  }
}
