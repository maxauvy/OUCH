// What the morning stiffness of a period looks like, described and not judged:
// the days noted, the days in each band, the band that came most often. No
// score, no threshold, no comparison with a norm.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import { MORNING_STIFFNESS_BANDS } from '../db/types.ts'
import type { DailyEntry, MorningStiffness } from '../db/types.ts'

export interface StiffnessSummary {
  /** Days with a band noted ("none" included: it is an answer). */
  noted: number
  counts: Record<MorningStiffness, number>
  /** The band noted on the most days; absent when two or more bands tie, rather than picking one. */
  commonest?: MorningStiffness
  /** The mean of the 0–10 intensity over the days it was noted, when it was. */
  severity?: { mean: number; n: number }
}

export function summarizeMorningStiffness(entries: readonly DailyEntry[]): StiffnessSummary {
  const counts = Object.fromEntries(MORNING_STIFFNESS_BANDS.map((b) => [b, 0])) as Record<MorningStiffness, number>
  let noted = 0
  const scores: number[] = []
  for (const e of entries) {
    if (e.morningStiffness) {
      counts[e.morningStiffness]++
      noted++
    }
    if (e.morningStiffnessSeverity !== undefined) scores.push(e.morningStiffnessSeverity)
  }
  const top = Math.max(...Object.values(counts))
  const leaders = MORNING_STIFFNESS_BANDS.filter((b) => counts[b] === top)
  return {
    noted,
    counts,
    ...(noted > 0 && leaders.length === 1 ? { commonest: leaders[0] } : {}),
    ...(scores.length ? { severity: { mean: scores.reduce((s, v) => s + v, 0) / scores.length, n: scores.length } } : {}),
  }
}
