// "Journée tranquille": a day the person chose to take gently. One flag on the day's entry, set by them from today's page and unset by them; the app
// answers with a lighter form and no suggestions for that day, and the report says how many such days there were. No pain level is needed, so the flag
// can be set before anything else is noted.

import type { DailyEntry } from '../db/types.ts'

/** Whether the day was chosen as a quiet one. */
export function isRestDay(entries: readonly Pick<DailyEntry, 'date' | 'restDay'>[], date: string): boolean {
  return entries.some((e) => e.date === date && e.restDay === true)
}

/** How many quiet days the person chose between two days (inclusive), logged or not. */
export function restDayCount(entries: readonly Pick<DailyEntry, 'date' | 'restDay'>[], from: string, to: string): number {
  return entries.filter((e) => e.restDay === true && e.date >= from && e.date <= to).length
}
