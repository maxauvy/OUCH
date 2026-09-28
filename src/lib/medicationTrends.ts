import type { DailyEntry, Medication, MedicationPeriod } from '../db/types'
import { shiftISO } from './medications'

export interface PosologyChange {
  med: Medication
  /** The period that starts at the change */
  period: MedicationPeriod
  /** Mean pain over the logged days in the window before / after */
  before: number
  after: number
  nBefore: number
  nAfter: number
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

/**
 * Mean pain in the `windowDays` before a dosage change against the
 * `windowDays` from it on, for changes inside [from, to]. Only changes with
 * at least `minDays` logged days on each side are kept: fewer says nothing.
 * Like the rest of Trends this is an observation, not an effect: pain also
 * drifts on its own, and a change is often made during a bad stretch.
 */
export function posologyChanges(
  entries: DailyEntry[],
  medications: Medication[],
  from: string,
  to: string,
  windowDays = 14,
  minDays = 5
): PosologyChange[] {
  const out: PosologyChange[] = []
  for (const med of medications) {
    if (med.regimen !== 'scheduled') continue
    med.periods.forEach((period, i) => {
      // A change is a period following another one, not a first start.
      if (i === 0 || period.start < from || period.start > to) return
      const beforeStart = shiftISO(period.start, -windowDays)
      const afterEnd = shiftISO(period.start, windowDays - 1)
      const before = entries.filter((e) => e.date >= beforeStart && e.date < period.start).map((e) => e.painLevel)
      const after = entries.filter((e) => e.date >= period.start && e.date <= afterEnd).map((e) => e.painLevel)
      if (before.length < minDays || after.length < minDays) return
      out.push({ med, period, before: mean(before), after: mean(after), nBefore: before.length, nAfter: after.length })
    })
  }
  return out.sort((a, b) => a.period.start.localeCompare(b.period.start))
}
