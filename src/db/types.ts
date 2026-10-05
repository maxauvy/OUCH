// Domain types for OUCH — kept in one place because the whole app
// (form, storage, charts, export) speaks this exact shape.

import type { Language } from '../i18n/language'

export type FactorKey =
  | 'fatigue'
  | 'sleep'
  | 'stress'
  | 'brainFog'
  | 'mood'
  | 'activity'
  | 'weather'
  | 'medications'
  | 'positiveActions'
  | 'painLocations'
  | 'notes'

// Display order for the factor list in Settings. Labels/helpers live in the
// active translation (`t.factors[key]`), not here.
export const ALL_FACTORS: FactorKey[] = [
  'fatigue',
  'sleep',
  'stress',
  'brainFog',
  'mood',
  'activity',
  'weather',
  'medications',
  'positiveActions',
  'painLocations',
  'notes',
]

export const DEFAULT_ENABLED_FACTORS: FactorKey[] = [
  'fatigue',
  'sleep',
  'stress',
  'brainFog',
  'mood',
  'activity',
  'weather',
  'medications',
  'positiveActions',
  'painLocations',
  'notes',
]

// Stable identifiers stored in entries — display labels live in the active
// translation (`t.bodyZones[zone]`), not here.
export const BODY_ZONES = [
  'head',
  'neck',
  'shoulders',
  'arms',
  'hands',
  'upperBack',
  'lowerBack',
  'chest',
  'stomach',
  'hips',
  'legs',
  'feet',
  'generalized',
] as const
export type BodyZone = (typeof BODY_ZONES)[number]

export type ExternalWeatherCondition =
  | 'ensoleille'
  | 'variable'
  | 'nuageux'
  | 'pluvieux'
  | 'orageux'
  | 'neige'

export interface WeatherInfo {
  source: 'auto' | 'manual'
  condition?: ExternalWeatherCondition
  tempC?: number
  pressureHpa?: number
  /** hPa change vs the previous logged day, when known */
  pressureDeltaFromPrevious?: number
}

export interface DailyEntry {
  id?: number
  /** ISO date 'YYYY-MM-DD', one entry per day, unique index */
  date: string
  createdAt: number
  updatedAt: number

  /** 0–10, the only truly required measure */
  painLevel: number

  fatigueLevel?: number
  sleepQuality?: number
  sleepHours?: number
  stressLevel?: number
  brainFog?: number
  moodLevel?: number
  activityLevel?: number

  weather?: WeatherInfo
  /** What was taken that day, pointing at the Medication registry. */
  intakes?: MedicationIntake[]
  positiveActions?: string[]
  painLocations?: BodyZone[]
  periodDay?: boolean
  notes?: string
}

/** Shape of entries saved before schema v3, which stored medication names
 * as free text. Only migration and backup import deal with it. */
export interface LegacyDailyEntry extends DailyEntry {
  medications?: string[]
}

// Medications are a registry (what is prescribed, and how that changed over
// time) plus per-day intakes (what was actually taken). The doctor report
// needs both: dose changes to mark on the timeline, and daily use to count.

/** 'scheduled': background treatment taken every day; 'asNeeded': taken
 * when needed, up to a maximum; 'unspecified': not described yet (every
 * medication typed before schema v3, or added on the fly from the form). */
export type MedicationRegimen = 'scheduled' | 'asNeeded' | 'unspecified'
export const MEDICATION_REGIMENS: MedicationRegimen[] = ['scheduled', 'asNeeded', 'unspecified']

export const DOSE_UNITS = ['mg', 'g', 'µg', 'ml', 'drop', 'puff', 'patch'] as const
export type DoseUnit = (typeof DOSE_UNITS)[number]

export interface Dose {
  amount: number
  unit: DoseUnit
}

export const MEDICATION_STOP_REASONS = ['ineffective', 'sideEffects', 'improved', 'other'] as const
export type MedicationStopReason = (typeof MEDICATION_STOP_REASONS)[number]

/** One stretch of time with a given posology. A dose change closes the
 * current period and opens a new one, so the history stays readable. */
export interface MedicationPeriod {
  /** ISO date 'YYYY-MM-DD', inclusive */
  start: string
  /** ISO date, inclusive; absent while the period is ongoing */
  end?: string
  /** Amount per intake */
  dose?: Dose
  /** scheduled: prescribed intakes per day; asNeeded: maximum per day */
  perDay?: number
  stopReason?: MedicationStopReason
}

export interface Medication {
  /** Random UUID rather than an auto-increment, so backups from two
   * devices can be merged without id collisions. */
  id: string
  name: string
  regimen: MedicationRegimen
  /** What it is taken for, in the person's own words */
  reason?: string
  /** Oldest first; the last one is the current or most recent posology */
  periods: MedicationPeriod[]
  createdAt: number
  updatedAt: number
}

export type ReliefLevel = 0 | 1 | 2 | 3

export interface MedicationIntake {
  medicationId: string
  /** Number of intakes; 0 = scheduled dose missed; absent = taken, count not
   * recorded (all intakes migrated from the free-text era). */
  doses?: number
  /** How much it helped: none, slight, moderate, strong */
  relief?: ReliefLevel
  sideEffects?: string[]
}

export type ThemePref = 'system' | 'light' | 'dark'

// How the app refers to the tracked parent on the child view (and, once
// gender-agreement is involved, in its generated sentences — see
// lib/childView.ts). Not exposed as a translation key: it drives grammar,
// not just a label.
export type ParentGender = 'maman' | 'papa'

// Stable identifiers for the illnesses the person tracks (asked by the
// setup, shown on the doctor report and explained on the child view).
// Labels and per-age copy live in lib/childView.ts, keyed by language.
export type Illness =
  | 'fibromyalgie'
  | 'arthrite'
  | 'spondylarthrite'
  | 'endometriose'
  | 'migraine'
  | 'lombalgie'
  | 'sep'
  | 'autre'

export const ILLNESSES: Illness[] = [
  'fibromyalgie',
  'arthrite',
  'spondylarthrite',
  'endometriose',
  'migraine',
  'lombalgie',
  'sep',
  'autre',
]

export interface Settings {
  id: 1
  enabledFactors: FactorKey[]
  theme: ThemePref
  reminderEnabled: boolean
  reminderTime: string // 'HH:MM'
  cycleTrackingEnabled: boolean
  displayName: string
  autoWeatherEnabled: boolean
  autoWeatherLat?: number
  autoWeatherLon?: number
  autoWeatherLabel?: string
  onboardingDone: boolean
  language: Language
  parentGender: ParentGender
  /** The illnesses being tracked, in the order they were picked; empty
   * until the person says (nothing is assumed). */
  illnesses: Illness[]
  /** When a backup was last exported from this device (ms). Not restored
   * from a backup file: it says nothing about this device's next loss. */
  lastBackupAt?: number
  /** The backup reminder stays quiet until then (ms). */
  backupReminderSnoozedUntil?: number
}

/** Settings saved before schema v6. Before v4 they held a single illness
 * (then only used by the child view); before v5 the factor list could hold
 * 'cycle', a toggle that did nothing (cycle tracking is `cycleTrackingEnabled`);
 * before v6 they held a choice between two interface designs.
 * Only migration and backup import deal with them. */
export interface LegacySettings extends Omit<Partial<Settings>, 'enabledFactors'> {
  childIllness?: Illness
  design?: 'health' | 'classic'
  enabledFactors?: (FactorKey | 'cycle')[]
}

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  enabledFactors: DEFAULT_ENABLED_FACTORS,
  theme: 'system',
  reminderEnabled: false,
  reminderTime: '20:00',
  cycleTrackingEnabled: false,
  displayName: '',
  autoWeatherEnabled: false,
  onboardingDone: false,
  language: 'fr',
  parentGender: 'maman',
  illnesses: [],
}

export type PainWeatherLevel = 1 | 2 | 3 | 4 | 5

export interface PainWeather {
  level: PainWeatherLevel
  icon: string
  color: string
  soft: string
  /** Text or icon color on a light background (`soft`, or the exported card). */
  ink: string
  /** Text color on the app's own surfaces, light or dark (a CSS variable). */
  text: string
}
