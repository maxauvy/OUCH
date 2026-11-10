// Scheduled treatments: a gentle word when doses were noted as missed lately.
// Descriptive only. Only days the person marked a dose as missed count (doses
// = 0); a day with nothing noted is unknown and is never counted as missed.
// The threshold is OUCH's own, not a clinical one.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry, Medication } from '../db/types.ts'
import { shiftISO } from './dates.ts'

/** The look-back window, in days (today excluded: it is not over). */
export const WINDOW_DAYS = 14
/** Missed doses noted in the window before a word is said. OUCH's own choice. */
export const MIN_MISSED = 3

export interface Regularity {
  medicationId: string
  name: string
  /** Days in the window with the dose marked missed. */
  missed: number
  /** Days in the window with an intake noted for it (taken or missed). */
  noted: number
  /** The most recent missed day: a new miss brings the word back, the same ones do not. */
  last: string
}

/** The scheduled treatment with the most missed doses in the last `WINDOW_DAYS` days, if at least `MIN_MISSED`. */
export function regularityReading(entries: readonly DailyEntry[], medications: readonly Medication[], today: string): Regularity | null {
  const from = shiftISO(today, -WINDOW_DAYS)
  const recent = entries.filter((e) => e.date >= from && e.date < today)
  let best: Regularity | null = null
  for (const med of medications) {
    if (med.regimen !== 'scheduled') continue
    // A treatment stopped before the window has nothing to say.
    const last = med.periods.at(-1)
    if (last?.end && last.end < from) continue
    let missed = 0
    let noted = 0
    let lastMiss = ''
    for (const e of recent) {
      const i = e.intakes?.find((x) => x.medicationId === med.id)
      if (!i) continue
      noted++
      if (i.doses === 0) {
        missed++
        if (e.date > lastMiss) lastMiss = e.date
      }
    }
    if (missed < MIN_MISSED) continue
    if (!best || missed > best.missed) best = { medicationId: med.id, name: med.name, missed, noted, last: lastMiss }
  }
  return best
}
