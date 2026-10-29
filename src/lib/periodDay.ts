// Whether a day was a day of the period, from what the person noted. Two inputs
// say it: the "period today" switch, and the flow (the indicator that replaces
// the switch when it is followed). The flow wins when it was answered, so the
// two never disagree; spotting is not a period. Without a flow, the switch.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry } from '../db/types.ts'

export function periodDayOf(entry: Pick<DailyEntry, 'periodDay' | 'periodFlow'>): boolean | undefined {
  if (entry.periodFlow !== undefined) return entry.periodFlow === 'light' || entry.periodFlow === 'heavy'
  return entry.periodDay
}
