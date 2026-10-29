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
  DOSE_UNITS,
  ILLNESSES,
  HEADACHE_DURATIONS,
  ILLNESS_STATUSES,
  JOINTS,
  LEG_PAIN_LEVELS,
  MORNING_STIFFNESS_BANDS,
  NIGHT_WAKINGS,
  PERIOD_FLOWS,
  REFRESHED_LEVELS,
  SYMPTOM_TAGS,
  MEDICATION_REGIMENS,
  MEDICATION_STOP_REASONS,
} from '../db/types.ts'
import type {
  DailyEntry,
  Dose,
  Headache,
  JointsFelt,
  LegacyDailyEntry,
  LegacySettings,
  Medication,
  MedicationIntake,
  MedicationPeriod,
  NightWakings,
  ReliefLevel,
  Settings,
  WeatherInfo,
} from '../db/types.ts'
import { cleanZones } from './bodyZones.ts'
import { cleanOtherName, FIRST_DIAGNOSIS_YEAR } from './illnessStatus.ts'
import type { LeadChoices } from './leads.ts'
import { MAX_TRIAL_HISTORY, type LeadTrial } from './leadTrial.ts'

/** Far above any real journal (a hundred years is ~36 500 days). */
const MAX_ENTRIES = 40_000
const MAX_MEDICATIONS = 2_000
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

/** Statuses by known illness, each one of the two allowed words. */
function illnessStatus(v: unknown): Settings['illnessStatus'] {
  if (!isRecord(v)) return undefined
  const out: NonNullable<Settings['illnessStatus']> = {}
  for (const illness of ILLNESSES) {
    const status = oneOf(v[illness], ILLNESS_STATUSES)
    if (status) out[illness] = status
  }
  return out
}

/** Diagnosis years by known illness, kept only for an illness declared
 * diagnosed, as a whole year from 1900 to this year. */
function illnessYear(v: unknown, status: unknown): Settings['illnessYear'] {
  if (!isRecord(v) || !isRecord(status)) return undefined
  const thisYear = new Date().getFullYear()
  const out: NonNullable<Settings['illnessYear']> = {}
  for (const illness of ILLNESSES) {
    const year = v[illness]
    if (status[illness] === 'diagnosed' && typeof year === 'number' && Number.isInteger(year) && year >= FIRST_DIAGNOSIS_YEAR && year <= thisYear) out[illness] = year
  }
  return out
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

function bool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

function jointsFelt(v: unknown): JointsFelt | undefined {
  if (!isRecord(v) || typeof v.yes !== 'boolean') return undefined
  // The joints only go with a "yes"; an unknown one, or a repeat, is dropped.
  const joints = v.yes ? [...new Set(strings(v.joints)?.filter((j) => (JOINTS as readonly string[]).includes(j)))] : []
  return joints.length ? { yes: true, joints: joints as NonNullable<JointsFelt['joints']> } : { yes: v.yes }
}

function headache(v: unknown): Headache | undefined {
  if (!isRecord(v) || typeof v.today !== 'boolean') return undefined
  // The details only go with a headache that day.
  if (!v.today) return { today: false }
  return defined({
    today: true,
    duration: oneOf(v.duration, HEADACHE_DURATIONS),
    aura: bool(v.aura),
    nausea: bool(v.nausea),
    sensitivity: bool(v.sensitivity),
    triggers: strings(v.triggers, 60)?.slice(0, 20),
    acuteMed: bool(v.acuteMed),
  })
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
    morningStiffness: oneOf(raw.morningStiffness, MORNING_STIFFNESS_BANDS),
    morningStiffnessSeverity: num(raw.morningStiffnessSeverity, 0, 10),
    nightWakings: typeof raw.nightWakings === 'number' && (NIGHT_WAKINGS as readonly number[]).includes(raw.nightWakings) ? (raw.nightWakings as NightWakings) : undefined,
    dailyInterference: num(raw.dailyInterference, 0, 10),
    wakingRefreshed: oneOf(raw.wakingRefreshed, REFRESHED_LEVELS),
    jointsFelt: jointsFelt(raw.jointsFelt),
    periodFlow: oneOf(raw.periodFlow, PERIOD_FLOWS),
    offCycleBleeding: bool(raw.offCycleBleeding),
    bowelPain: bool(raw.bowelPain),
    urinary: bool(raw.urinary),
    headache: headache(raw.headache),
    legPain: oneOf(raw.legPain, LEG_PAIN_LEVELS),
    symptomTags: (() => {
      const tags = strings(raw.symptomTags)
      return tags && [...new Set(tags.filter((t) => (SYMPTOM_TAGS as readonly string[]).includes(t)))] as DailyEntry['symptomTags']
    })(),
    spasms: num(raw.spasms, 0, 10),
    feverInfection: bool(raw.feverInfection),
    newSymptom: bool(raw.newSymptom),
    sensorySensitivity: num(raw.sensorySensitivity, 0, 10),
    weather: weather(raw.weather),
    intakes: intakes(raw.intakes),
    // Free-text medication names of backups from before the registry existed.
    medications: strings(raw.medications),
    positiveActions: strings(raw.positiveActions),
    // Zones of every version are valid; an unknown one (or a repeat) is dropped.
    painLocations: (() => {
      const zones = strings(raw.painLocations)
      return zones && cleanZones(zones)
    })(),
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

const MAX_LEAD_CHOICES = 100

/** What was answered to each lead: a known answer, when, and the numbers it was given on. */
function leadChoices(v: unknown): LeadChoices | undefined {
  if (!isRecord(v)) return undefined
  const entries = Object.entries(v).slice(0, MAX_LEAD_CHOICES)
  const out: LeadChoices = {}
  for (const [key, raw] of entries) {
    if (key.length > MAX_SHORT_TEXT || !isRecord(raw)) continue
    const choice = oneOf(raw.choice, ['kept', 'dismissed'] as const)
    const at = num(raw.at, 0, Number.MAX_SAFE_INTEGER)
    const gap = num(raw.gap, -10, 10)
    const days = num(raw.days, 0, MAX_ENTRIES)
    if (choice && at !== undefined && gap !== undefined && days !== undefined) out[key] = { choice, at, gap, days }
  }
  // Nothing in the file was usable: keep what this device holds, rather than clearing it.
  return entries.length > 0 && Object.keys(out).length === 0 ? undefined : out
}

/** A one-week trial: a known kind of key, its action, and a first and last day a few days apart. */
function leadTrial(v: unknown): LeadTrial | undefined {
  if (!isRecord(v)) return undefined
  const key = str(v.key)
  const action = str(v.action)
  if (!key?.startsWith('action:') || !action?.trim() || !isISODate(v.start) || !isISODate(v.end)) return undefined
  const days = (Date.parse(`${v.end}T12:00:00Z`) - Date.parse(`${v.start}T12:00:00Z`)) / 86_400_000
  return days >= 0 && days <= 30 ? { key, action, start: v.start, end: v.end } : undefined
}

/** The weeks closed: each one well formed, a cap of them. */
function leadTrialHistory(v: unknown): LeadTrial[] | undefined {
  if (!Array.isArray(v)) return undefined
  const weeks = v.slice(0, MAX_TRIAL_HISTORY).flatMap((t) => leadTrial(t) ?? [])
  // Nothing in the file was usable: keep what this device holds, rather than clearing it.
  return v.length > 0 && weeks.length === 0 ? undefined : weeks
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
    suggestionsEnabled: bool(raw.suggestionsEnabled),
    hardDaysCardEnabled: bool(raw.hardDaysCardEnabled),
    lightFormEnabled: bool(raw.lightFormEnabled),
    kidsTabEnabled: bool(raw.kidsTabEnabled),
    illnesses: strings(raw.illnesses)?.filter((i) => (ILLNESSES as string[]).includes(i)) as LegacySettings['illnesses'],
    illnessStatus: illnessStatus(raw.illnessStatus),
    otherIllnessName: typeof raw.otherIllnessName === 'string' ? cleanOtherName(raw.otherIllnessName) : undefined,
    illnessYear: illnessYear(raw.illnessYear, raw.illnessStatus),
    childIllness: oneOf(raw.childIllness, ILLNESSES),
    leadChoices: leadChoices(raw.leadChoices),
    leadPromptEnabled: bool(raw.leadPromptEnabled),
    weeklySentenceEnabled: bool(raw.weeklySentenceEnabled),
    leadDotEnabled: bool(raw.leadDotEnabled),
    trialsEnabled: bool(raw.trialsEnabled),
    morningStiffnessSeverityEnabled: bool(raw.morningStiffnessSeverityEnabled),
    indicatorInviteDone: bool(raw.indicatorInviteDone),
    indicatorInviteSnoozeUntil: isISODate(raw.indicatorInviteSnoozeUntil) ? raw.indicatorInviteSnoozeUntil : undefined,
    indicatorInviteDismissCount: typeof raw.indicatorInviteDismissCount === 'number' && Number.isInteger(raw.indicatorInviteDismissCount) ? num(raw.indicatorInviteDismissCount, 0, 2) : undefined,
    leadTrial: leadTrial(raw.leadTrial),
    leadTrialHistory: leadTrialHistory(raw.leadTrialHistory),
  })
}

interface SanitizedBackup {
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
