import { db } from '../db'
import { LAST_SHOWN_KEY } from './reminder'

// Everything OUCH keeps in the browser: the IndexedDB database (journal,
// treatments, settings — the language and the name included) and one
// localStorage key. Not the service worker's cache: it holds the app's own
// files, no personal data, and the app must still open offline afterwards.
//
// localStorage is shared by every page served from the same origin (a
// github.io user site can host several apps), so only this app's key is
// removed, never `clear()`.

const WIPED_FLAG = 'ouch:wiped'

export async function wipeLocalData(): Promise<void> {
  await db.delete()
  localStorage.removeItem(LAST_SHOWN_KEY)
  // Read once at the next start to say it worked: the app comes back as on a
  // first visit, with nothing to show where the data was.
  try {
    sessionStorage.setItem(WIPED_FLAG, '1')
  } catch {
    // The notice is a courtesy; the data is gone either way.
  }
}

/** Whether the app was just wiped in this tab, until `clearWipedNotice`. */
export function wipedNotice(): boolean {
  try {
    return sessionStorage.getItem(WIPED_FLAG) === '1'
  } catch {
    return false
  }
}

export function clearWipedNotice(): void {
  try {
    sessionStorage.removeItem(WIPED_FLAG)
  } catch {
    // Same: nothing to clean up.
  }
}
