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
  | 'painLocations'
  | 'cycle'
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
  'painLocations',
  'cycle',
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
  medications?: string[]
  painLocations?: BodyZone[]
  periodDay?: boolean
  notes?: string
}

export type ThemePref = 'system' | 'light' | 'dark'

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
}

export type PainWeatherLevel = 1 | 2 | 3 | 4 | 5

export interface PainWeather {
  level: PainWeatherLevel
  icon: string
  color: string
  soft: string
}
