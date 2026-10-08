import type { Medication, MedicationPeriod } from '../db/types'

export interface TreatmentEvent {
  med: Medication
  kind: 'started' | 'doseChanged' | 'stopped'
  /** First day of the new posology; for a stop, the last day taken */
  date: string
  period: MedicationPeriod
  /** The posology it replaced, for a change */
  previous?: MedicationPeriod
}

/** Every start, dose change and stop in the registry, oldest first. */
export function treatmentEvents(medications: Medication[]): TreatmentEvent[] {
  const events: TreatmentEvent[] = []
  for (const med of medications) {
    med.periods.forEach((period, i) => {
      events.push(
        i > 0
          ? { med, kind: 'doseChanged', date: period.start, period, previous: med.periods[i - 1] }
          : { med, kind: 'started', date: period.start, period }
      )
      if (i === med.periods.length - 1 && period.end) events.push({ med, kind: 'stopped', date: period.end, period })
    })
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
}
