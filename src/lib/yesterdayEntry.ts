// A gentle offer to write down yesterday, for someone who usually writes every
// day. Pure (no React, no Dexie), so plain Node can test it.
//
// Why: a day written the next day is still close (1-day recall matches the
// day's momentary ratings, Broderick 2008), while memory fades after a few days
// (same study; Marty 2009). So the best moment to fill in a missed day is the
// morning after, not three days later. The offer never insists: it is a line in
// the day's list, set aside with one tap.
import { shiftISO } from './dates.ts'

/**
 * Yesterday's date when it has no pain level and the day before has one (a person
 * who writes most days has just missed one), else null. Someone who writes every
 * other day, or who has been away, is never asked: the offer is for the one
 * missed day, not a reproach for a pattern.
 */
export function missedYesterday(logged: readonly { date: string }[], today: string): string | null {
  const dates = new Set(logged.map((e) => e.date))
  const yesterday = shiftISO(today, -1)
  if (dates.has(yesterday)) return null
  return dates.has(shiftISO(today, -2)) ? yesterday : null
}
