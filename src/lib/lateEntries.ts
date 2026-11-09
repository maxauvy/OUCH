// A day written down after the day itself ("saisie après coup"). Pure (no
// React, no Dexie), so plain Node can test it.
import type { DailyEntry } from '../db/types'
import { daysBetween, todayISO } from './dates.ts'

/** Until 04:00 the small hours still belong to the evening before: someone who
 * fills the day in at 00:30 has not written it late. */
const GRACE_MS = 4 * 3_600_000

/** In the report, a day counts as late from this many days after: the day before
 * is still reliably recalled (see the sources card), memory fades after. */
export const LATE_FROM_DAYS_IN_REPORT = 2

/** Whole days between the entry's date and the day it was first written, 0 when
 * written on time. Based on `createdAt`, so an entry created on the day itself
 * (a zone, a treatment) whose pain was added later is not seen as late. */
export function daysLate(entry: Pick<DailyEntry, 'date' | 'createdAt'>): number {
  if (!entry.createdAt) return 0
  const written = todayISO(new Date(entry.createdAt - GRACE_MS))
  return Math.max(0, daysBetween(entry.date, written))
}

/** How many of the entries were written `LATE_FROM_DAYS_IN_REPORT` days or more after their day. */
export function lateCount(entries: Pick<DailyEntry, 'date' | 'createdAt'>[]): number {
  return entries.filter((e) => daysLate(e) >= LATE_FROM_DAYS_IN_REPORT).length
}
