// Domain types for Accalmie — kept in one place because the whole app
// (form, storage, charts, export) speaks this exact shape.

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

export const ALL_FACTORS: { key: FactorKey; label: string; helper: string }[] = [
  { key: 'fatigue', label: 'Fatigue', helper: 'Niveau de fatigue générale' },
  { key: 'sleep', label: 'Sommeil', helper: 'Qualité et durée de la nuit précédente' },
  { key: 'stress', label: 'Stress', helper: 'Charge mentale / tension ressentie' },
  { key: 'brainFog', label: 'Brouillard mental', helper: 'Concentration, mémoire, clarté d’esprit' },
  { key: 'mood', label: 'Humeur', helper: 'Ressenti émotionnel global' },
  { key: 'activity', label: 'Activité physique', helper: 'Niveau d’effort du jour' },
  { key: 'weather', label: 'Météo extérieure', helper: 'Conditions et pression atmosphérique' },
  { key: 'medications', label: 'Médicaments', helper: 'Traitements pris dans la journée' },
  { key: 'painLocations', label: 'Localisation de la douleur', helper: 'Zones du corps touchées' },
  { key: 'cycle', label: 'Cycle menstruel', helper: 'Suivi du cycle, si pertinent' },
  { key: 'notes', label: 'Notes libres', helper: 'Tout ce qui ne rentre pas dans les cases' },
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

export const BODY_ZONES = [
  'Tête',
  'Cou',
  'Épaules',
  'Bras',
  'Mains',
  'Dos haut',
  'Dos bas',
  'Poitrine',
  'Ventre',
  'Hanches',
  'Jambes',
  'Pieds',
  'Généralisée',
] as const
export type BodyZone = (typeof BODY_ZONES)[number]

export type ExternalWeatherCondition =
  | 'ensoleille'
  | 'variable'
  | 'nuageux'
  | 'pluvieux'
  | 'orageux'
  | 'neige'

export const EXTERNAL_WEATHER_LABELS: Record<ExternalWeatherCondition, string> = {
  ensoleille: 'Ensoleillé',
  variable: 'Variable',
  nuageux: 'Nuageux',
  pluvieux: 'Pluvieux',
  orageux: 'Orageux',
  neige: 'Neige',
}

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
}

export type PainWeatherLevel = 1 | 2 | 3 | 4 | 5

export interface PainWeather {
  level: PainWeatherLevel
  label: string
  icon: string
  color: string
  soft: string
}
