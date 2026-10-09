// A backup is decrypted with a password, but nothing says the file was made
// by this app: it may be corrupted, or crafted. Whatever it holds ends up in
// IndexedDB and is read back by every screen, so a wrongly typed field
// (`intakes` that is not a list, a `painLevel` that is text…) would crash the
// app at each launch. Everything is rebuilt here field by field: only known
// keys with the right type and range are kept, and an entry or medication
// that cannot stand on its own is skipped rather than half-imported.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import {
  ALL_FACTORS,
  BODY_ZONES,
  DOSE_UNITS,
  ILLNESSES,
  MEDICATION_REGIMENS,
  MEDICATION_STOP_REASONS,
} from '../db/types.ts'
import type {
  BodyZone,
  Dose,
  LegacyDailyEntry,
  LegacySettings,
  Medication,
  MedicationIntake,
  MedicationPeriod,
  ReliefLevel,
  WeatherInfo,
} from '../db/types.ts'

/** Far above any real journal (a hundred years is ~36 500 days). */
export const MAX_ENTRIES = 40_000
export const MAX_MEDICATIONS = 2_000
const MAX_TEXT = 10_000
const MAX_SHORT_TEXT = 200
const MAX_LIST = 200

type Raw = Record<string, unknown>

function isRecord(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined
}

function str(v: unknown, max = MAX_SHORT_TEXT): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined
}

function strings(v: unknown, max = MAX_SHORT_TEXT): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  return v.filter((s): s is string => typeof s === 'string').slice(0, MAX_LIST).map((s) => s.slice(0, max))
}

/** 'YYYY-MM-DD' naming a real calendar day. */
export function isISODate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

/** Drops the keys whose value is undefined, so a merge never overwrites
 * something with "nothing". */
function defined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

function timestamp(v: unknown, fallback: number): number {
  return num(v, 0, 8.64e15) ?? fallback
}

function weather(v: unknown): WeatherInfo | undefined {
  if (!isRecord(v)) return undefined
  const source = oneOf(v.source, ['auto', 'manual'] as const)
  if (!source) return undefined
  return defined({
    source,
    condition: oneOf(v.condition, ['ensoleille', 'variable', 'nuageux', 'pluvieux', 'orageux', 'neige'] as const),
    tempC: num(v.tempC, -100, 100),
    pressureHpa: num(v.pressureHpa, 0, 2000),
    pressureDeltaFromPrevious: num(v.pressureDeltaFromPrevious, -500, 500),
  })
}

function intakes(v: unknown): MedicationIntake[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: MedicationIntake[] = []
  for (const raw of v.slice(0, MAX_LIST)) {
    if (!isRecord(raw)) continue
    const medicationId = str(raw.medicationId, 100)
    if (!medicationId) continue
    out.push(
      defined({
        medicationId,
        doses: num(raw.doses, 0, 1000),
        relief: typeof raw.relief === 'number' && [0, 1, 2, 3].includes(raw.relief) ? (raw.relief as ReliefLevel) : undefined,
        sideEffects: strings(raw.sideEffects),
      })
    )
  }
  return out
}

/** Null when the entry cannot be used (no valid day, or a pain level that is
 * not a number from 0 to 10). */
export function sanitizeEntry(raw: unknown, now = Date.now()): LegacyDailyEntry | null {
  if (!isRecord(raw) || !isISODate(raw.date)) return null
  // A day saved without a pain level (a zone tapped, a note typed) is valid;
  // a pain level that is present but unusable is not.
  const painLevel = num(raw.painLevel, 0, 10)
  if (painLevel === undefined && raw.painLevel != null) return null
  return defined({
    date: raw.date,
    createdAt: timestamp(raw.createdAt, now),
    updatedAt: timestamp(raw.updatedAt, now),
    painLevel,
    fatigueLevel: num(raw.fatigueLevel, 0, 10),
    sleepQuality: num(raw.sleepQuality, 0, 10),
    sleepHours: num(raw.sleepHours, 0, 24),
    stressLevel: num(raw.stressLevel, 0, 10),
    brainFog: num(raw.brainFog, 0, 10),
    moodLevel: num(raw.moodLevel, 0, 10),
    activityLevel: num(raw.activityLevel, 0, 10),
    weather: weather(raw.weather),
    intakes: intakes(raw.intakes),
    // Free-text medication names of backups from before the registry existed.
    medications: strings(raw.medications),
    positiveActions: strings(raw.positiveActions),
    painLocations: strings(raw.painLocations)?.filter((z): z is BodyZone => (BODY_ZONES as readonly string[]).includes(z)),
    periodDay: typeof raw.periodDay === 'boolean' ? raw.periodDay : undefined,
    notes: str(raw.notes, MAX_TEXT),
  })
}

function dose(v: unknown): Dose | undefined {
  if (!isRecord(v)) return undefined
  const amount = num(v.amount, 0, 1_000_000)
  const unit = oneOf(v.unit, DOSE_UNITS)
  return amount !== undefined && unit ? { amount, unit } : undefined
}

function periods(v: unknown): MedicationPeriod[] {
  if (!Array.isArray(v)) return []
  const out: MedicationPeriod[] = []
  for (const raw of v.slice(0, MAX_LIST)) {
    if (!isRecord(raw) || !isISODate(raw.start)) continue
    out.push(
      defined({
        start: raw.start,
        end: isISODate(raw.end) ? raw.end : undefined,
        dose: dose(raw.dose),
        perDay: num(raw.perDay, 0, 1000),
        stopReason: oneOf(raw.stopReason, MEDICATION_STOP_REASONS),
      })
    )
  }
  return out
}

/** Null when the medication has no id or name. */
export function sanitizeMedication(raw: unknown, now = Date.now()): Medication | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id, 100)
  const name = str(raw.name)?.trim()
  if (!id || !name) return null
  return defined({
    id,
    name,
    regimen: oneOf(raw.regimen, MEDICATION_REGIMENS) ?? 'unspecified',
    reason: str(raw.reason),
    periods: periods(raw.periods),
    createdAt: timestamp(raw.createdAt, now),
    updatedAt: timestamp(raw.updatedAt, now),
  })
}

/** Only what is valid is kept, and nothing is filled in: a setting the file
 * does not (validly) hold stays as it is on this device. */
export function sanitizeSettings(raw: unknown): LegacySettings | undefined {
  if (!isRecord(raw)) return undefined
  const factors: readonly string[] = [...ALL_FACTORS, 'cycle']
  const time = typeof raw.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.reminderTime)
  const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined)
  return defined({
    enabledFactors: strings(raw.enabledFactors)?.filter((f) => factors.includes(f)) as LegacySettings['enabledFactors'],
    theme: oneOf(raw.theme, ['system', 'light', 'dark'] as const),
    design: oneOf(raw.design, ['health', 'classic'] as const),
    reminderEnabled: bool(raw.reminderEnabled),
    reminderTime: time ? (raw.reminderTime as string) : undefined,
    cycleTrackingEnabled: bool(raw.cycleTrackingEnabled),
    displayName: str(raw.displayName),
    autoWeatherEnabled: bool(raw.autoWeatherEnabled),
    autoWeatherLat: num(raw.autoWeatherLat, -90, 90),
    autoWeatherLon: num(raw.autoWeatherLon, -180, 180),
    autoWeatherLabel: str(raw.autoWeatherLabel),
    onboardingDone: bool(raw.onboardingDone),
    language: oneOf(raw.language, ['fr', 'en'] as const),
    parentGender: oneOf(raw.parentGender, ['maman', 'papa'] as const),
    hardDaysCardEnabled: bool(raw.hardDaysCardEnabled),
    lightFormEnabled: bool(raw.lightFormEnabled),
    illnesses: strings(raw.illnesses)?.filter((i) => (ILLNESSES as string[]).includes(i)) as LegacySettings['illnesses'],
    childIllness: oneOf(raw.childIllness, ILLNESSES),
  })
}

export interface SanitizedBackup {
  entries: LegacyDailyEntry[]
  medications: Medication[]
  settings?: LegacySettings
  /** Entries and medications that were left out because they were unusable. */
  skipped: number
}

/** Null when the decrypted content is not a backup at all, or is absurdly large. */
export function sanitizeBackup(raw: unknown, now = Date.now()): SanitizedBackup | null {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return null
  const rawMedications = Array.isArray(raw.medications) ? raw.medications : []
  if (raw.entries.length > MAX_ENTRIES || rawMedications.length > MAX_MEDICATIONS) return null

  let skipped = 0
  const entries: LegacyDailyEntry[] = []
  for (const r of raw.entries) {
    const entry = sanitizeEntry(r, now)
    if (entry) entries.push(entry)
    else skipped++
  }
  const medications: Medication[] = []
  for (const r of rawMedications) {
    const med = sanitizeMedication(r, now)
    if (med) medications.push(med)
    else skipped++
  }
  return { entries, medications, settings: sanitizeSettings(raw.settings), skipped }
}
