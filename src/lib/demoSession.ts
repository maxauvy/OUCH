import Dexie from 'dexie'
import { db } from '../db'
import { DEMO_DB_NAME, DEMO_KEY, DEMO_TOUR_KEY, type DemoLanguage } from './demoMode'

/** Starts the demo in `language`, with the guided tour, by reloading into its sandbox. */
export function startDemo(language: DemoLanguage): void {
  try {
    localStorage.setItem(DEMO_KEY, language)
    localStorage.setItem(DEMO_TOUR_KEY, 'pending')
  } catch {
    return
  }
  location.reload()
}

/** Leaves the demo: the sandbox and its flags go, and the app reloads on the
 * person's own journal, which was never touched. No confirmation: nothing in
 * the sandbox is worth keeping. */
export async function exitDemo(): Promise<void> {
  db.close()
  try {
    await Dexie.delete(DEMO_DB_NAME)
  } finally {
    try {
      localStorage.removeItem(DEMO_KEY)
      localStorage.removeItem(DEMO_TOUR_KEY)
    } catch {
      // The sandbox is gone; a stale flag would only recreate it.
    }
    location.reload()
  }
}

export function tourPending(): boolean {
  try {
    return localStorage.getItem(DEMO_TOUR_KEY) === 'pending'
  } catch {
    return false
  }
}

export function finishTour(): void {
  try {
    localStorage.setItem(DEMO_TOUR_KEY, 'done')
  } catch {
    // The tour would show again at the next start: a courtesy lost, nothing more.
  }
}
