import type { DailyEntry, LoggedEntry } from '../db/types'

export function hasPain(entry: DailyEntry): entry is LoggedEntry {
  return typeof entry.painLevel === 'number'
}

/** The days with a pain level, for every statistic. A day saved without one
 * (a zone tapped, a note typed) is not a day of "no pain". */
export function loggedEntries(entries: readonly DailyEntry[]): LoggedEntry[] {
  return entries.filter(hasPain)
}
