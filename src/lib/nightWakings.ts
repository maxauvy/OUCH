// The wakings because of pain over a period, described: the days noted, the
// days with at least one, the mean per day noted. The top choice is "three or
// more", so the mean counts it as 3 and the report says so. No threshold.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry } from '../db/types.ts'

export interface NightWakingsSummary {
  /** Days with a number noted (0 included: it is an answer). */
  noted: number
  /** Days with at least one waking. */
  withWaking: number
  /** Mean per day noted, "three or more" counted as 3; absent with no day noted. */
  mean?: number
}

export function summarizeNightWakings(entries: readonly DailyEntry[]): NightWakingsSummary {
  const counts: number[] = entries.flatMap((e) => (e.nightWakings === undefined ? [] : [e.nightWakings]))
  return {
    noted: counts.length,
    withWaking: counts.filter((n) => n > 0).length,
    ...(counts.length ? { mean: counts.reduce((s, n) => s + n, 0) / counts.length } : {}),
  }
}
