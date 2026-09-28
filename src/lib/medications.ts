import type {
  Dose,
  Medication,
  MedicationIntake,
  MedicationPeriod,
  MedicationStopReason,
} from '../db/types'

export function newMedicationId(): string {
  return crypto.randomUUID()
}

/** Shifts an ISO date by whole days (UTC noon, so DST never skips a day). */
export function shiftISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Names are matched loosely: "Paracétamol " and "paracétamol" are one medication. */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()
}

export function periodOn(med: Medication, date: string): MedicationPeriod | undefined {
  return med.periods.find((p) => p.start <= date && (!p.end || p.end >= date))
}

export function currentPeriod(med: Medication): MedicationPeriod | undefined {
  return med.periods[med.periods.length - 1]
}

export function isStopped(med: Medication): boolean {
  return !!currentPeriod(med)?.end
}

/** Scheduled medications are pre-filled as taken on a new day; the person
 * only has to untick a missed dose. */
export function defaultIntakes(meds: Medication[], date: string): MedicationIntake[] {
  return meds
    .filter((m) => m.regimen === 'scheduled')
    .flatMap((m) => {
      const p = periodOn(m, date)
      return p ? [{ medicationId: m.id, doses: p.perDay ?? 1 }] : []
    })
}

/** New posology from `from` on: closes the current period the day before,
 * or corrects it in place when it started that same day. */
export function changePosology(
  med: Medication,
  from: string,
  next: { dose?: Dose; perDay?: number }
): MedicationPeriod[] {
  const periods = med.periods.slice()
  const last = periods[periods.length - 1]
  if (last && last.start >= from) {
    periods[periods.length - 1] = { ...last, ...next, end: undefined, stopReason: undefined }
  } else {
    if (last && !last.end) periods[periods.length - 1] = { ...last, end: shiftISO(from, -1) }
    periods.push({ start: from, ...next })
  }
  return periods
}

export function stopMedication(med: Medication, end: string, reason?: MedicationStopReason): MedicationPeriod[] {
  const periods = med.periods.slice()
  const last = periods[periods.length - 1]
  if (last) periods[periods.length - 1] = { ...last, end: end < last.start ? last.start : end, stopReason: reason }
  return periods
}

/** Restarts a stopped medication with its last posology. */
export function resumeMedication(med: Medication, from: string): MedicationPeriod[] {
  const last = currentPeriod(med)
  return [...med.periods, { start: from, dose: last?.dose, perDay: last?.perDay }]
}

/**
 * Turns free-text medication names (entries saved before schema v3, or
 * backups made then) into registry medications plus intakes. Names already
 * in `existing` reuse that medication; others are created as 'unspecified',
 * starting on the first day they appear.
 */
export function createLegacyConverter(existing: Medication[], now = Date.now()) {
  const byName = new Map<string, Medication>()
  for (const m of existing) byName.set(m.name.trim().toLocaleLowerCase(), m)
  const created: Medication[] = []

  function intakesFor(names: string[] | undefined, date: string): MedicationIntake[] {
    const seen = new Set<string>()
    const intakes: MedicationIntake[] = []
    for (const raw of names ?? []) {
      const name = raw.trim()
      const key = name.toLocaleLowerCase()
      if (!name || seen.has(key)) continue
      seen.add(key)
      let med = byName.get(key)
      if (!med) {
        med = { id: newMedicationId(), name, regimen: 'unspecified', periods: [{ start: date }], createdAt: now, updatedAt: now }
        byName.set(key, med)
        created.push(med)
      } else if (created.includes(med) && date < med.periods[0].start) {
        med.periods[0].start = date
      }
      intakes.push({ medicationId: med.id })
    }
    return intakes
  }

  return { intakesFor, created }
}
