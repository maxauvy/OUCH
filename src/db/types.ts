// Domain types for OUCH — kept in one place because the whole app
// (form, storage, charts, export) speaks this exact shape.

import type { Language } from '../i18n/language'
import type { HardDaysSeen } from '../lib/hardDays'
import type { LeadChoices } from '../lib/leads'
import type { LeadsSeen } from '../lib/leadHints'
import type { LeadTrial } from '../lib/leadTrial'

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
  | 'morningStiffness'
  | 'nightWaking'
  | 'dailyInterference'
  | 'unrefreshedWaking'
  | 'swollenJoints'
  | 'periodFlow'
  | 'bowelBladder'
  | 'headacheEpisode'
  | 'legPain'
  | 'symptomTags'
  | 'spasms'
  | 'feverInfection'
  | 'newSymptomMarker'
  | 'sensorySensitivity'

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
  'morningStiffness',
  'nightWaking',
  'dailyInterference',
  'unrefreshedWaking',
  'swollenJoints',
  'periodFlow',
  'bowelBladder',
  'headacheEpisode',
  'legPain',
  'symptomTags',
  'spasms',
  'feverInfection',
  'newSymptomMarker',
  'sensorySensitivity',
]

const DEFAULT_ENABLED_FACTORS: FactorKey[] = [
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
//
// The zones follow the 19 regions of the Widespread Pain Index (WPI) with the
// left and right side told apart, plus head, hands and feet (not in the WPI).
// A zone is either on the midline (one identifier) or has a side, in which
// case the identifier is the side followed by the region: 'leftShoulder'.
export const MIDLINE_ZONES = ['head', 'neck', 'chest', 'stomach', 'upperBack', 'lowerBack'] as const
export const SIDED_REGIONS = ['jaw', 'shoulder', 'upperArm', 'lowerArm', 'hand', 'hip', 'upperLeg', 'lowerLeg', 'foot'] as const
export type MidlineZone = (typeof MIDLINE_ZONES)[number]
export type SidedRegion = (typeof SIDED_REGIONS)[number]
export type BodySide = 'left' | 'right'
export type SidedZone = `${BodySide}${Capitalize<SidedRegion>}`

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const sidedZone = (side: BodySide, region: SidedRegion) => `${side}${cap(region)}` as SidedZone
export const SIDED_ZONES: readonly SidedZone[] = SIDED_REGIONS.flatMap((r) => [sidedZone('left', r), sidedZone('right', r)])

// Zones of the first versions, kept as they are: "Arms" does not say which
// arm, which part of it, so nothing is converted by guesswork. They stay
// readable and can be replaced by precise zones whenever the person edits
// the day. 'generalized' is the person saying it hurts everywhere; it does not
// tick every zone.
export const COARSE_ZONES = ['shoulders', 'arms', 'hands', 'hips', 'legs', 'feet'] as const
export const BODY_ZONES = [...MIDLINE_ZONES, ...SIDED_ZONES, ...COARSE_ZONES, 'generalized'] as const
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

/** How long it takes to loosen up on waking, in bands: the duration, not a
 * score. 'none' is an answer (no stiffness), unlike a day left blank. */
export const MORNING_STIFFNESS_BANDS = ['none', 'lt30', '30to60', '1to2h', 'gt2h'] as const
export type MorningStiffness = (typeof MORNING_STIFFNESS_BANDS)[number]

/** Wakings in the night because of pain; 3 stands for "three or more". */
export const NIGHT_WAKINGS = [0, 1, 2, 3] as const
export type NightWakings = (typeof NIGHT_WAKINGS)[number]

/** Whether the person woke rested, in four levels (not validated). */
export const REFRESHED_LEVELS = ['yes', 'fairly', 'little', 'no'] as const
export type Refreshed = (typeof REFRESHED_LEVELS)[number]

/** Joints the person can say they feel painful or swollen, with the side. Their own list: the body zones are too broad for an elbow or an ankle. */
export const JOINT_REGIONS = ['wrist', 'hand', 'elbow', 'knee', 'ankle', 'foot'] as const
export type JointRegion = (typeof JOINT_REGIONS)[number]
export type JointKey = `${BodySide}${Capitalize<JointRegion>}`
export const JOINTS: readonly JointKey[] = JOINT_REGIONS.flatMap((r) => (['left', 'right'] as const).map((side) => `${side}${r.charAt(0).toUpperCase()}${r.slice(1)}` as JointKey))

/** What the person felt, never a count by an examiner. */
export interface JointsFelt {
  yes: boolean
  /** Only when `yes`. */
  joints?: JointKey[]
}

export const PERIOD_FLOWS = ['none', 'spotting', 'light', 'heavy'] as const
export type PeriodFlow = (typeof PERIOD_FLOWS)[number]

export const HEADACHE_DURATIONS = ['lt4h', '4to24h', 'gt24h'] as const
export type HeadacheDuration = (typeof HEADACHE_DURATIONS)[number]

/** A headache day, for a condition that comes in episodes. `today: false` is an answer. */
export interface Headache {
  today: boolean
  duration?: HeadacheDuration
  aura?: boolean
  nausea?: boolean
  /** Bothered by light or noise. */
  sensitivity?: boolean
  triggers?: string[]
  /** A medication for the attack was taken. */
  acuteMed?: boolean
}

/** How far the leg pain goes (not validated). 'none' is an answer. */
export const LEG_PAIN_LEVELS = ['none', 'toKnee', 'belowKnee'] as const
export type LegPain = (typeof LEG_PAIN_LEVELS)[number]

/** The signs of the day the person ticks, as they are described in the illnesses that bring them (nerve pain, multiple sclerosis). */
export const SYMPTOM_TAGS = ['tingling', 'numbness', 'burning', 'shocks', 'blurredVision', 'urgency', 'dizziness'] as const
export type SymptomTag = (typeof SYMPTOM_TAGS)[number]

export interface DailyEntry {
  id?: number
  /** ISO date 'YYYY-MM-DD', one entry per day, unique index */
  date: string
  createdAt: number
  updatedAt: number

  /** 0–10; missing = the day was not rated, which is not "no pain" */
  painLevel?: number

  fatigueLevel?: number
  sleepQuality?: number
  sleepHours?: number
  stressLevel?: number
  brainFog?: number
  moodLevel?: number
  activityLevel?: number
  /** Not validated: how long the stiffness on waking lasted, in bands. */
  morningStiffness?: MorningStiffness
  /** 0–10, only asked when `Settings.morningStiffnessSeverityEnabled` is on. Not validated. */
  morningStiffnessSeverity?: number
  /** Not validated: wakings because of pain, inside the sleep block. 0 is an answer. */
  nightWakings?: NightWakings
  /** 0–10, not validated: how much the pain got in the way of the day's gestures. */
  dailyInterference?: number
  /** Not validated: waking rested or not, inside the sleep block. */
  wakingRefreshed?: Refreshed
  /** What the person feels in their joints; a report of a feeling. Not validated. */
  jointsFelt?: JointsFelt
  /** The flow of the period; with the cycle tracking on. Not validated. */
  periodFlow?: PeriodFlow
  /** Bleeding outside the period. */
  offCycleBleeding?: boolean
  /** Pain at the toilet, and trouble passing urine, linked to the cycle. */
  bowelPain?: boolean
  urinary?: boolean
  headache?: Headache
  /** Not validated: leg pain, in three levels. */
  legPain?: LegPain
  /** Not validated: the signs of the day ticked; an empty list is an answer (none today). */
  symptomTags?: SymptomTag[]
  /** 0–10, not validated: muscle spasms or stiffness in the legs. */
  spasms?: number
  /** Fever or an infection at the moment: context, nothing more. */
  feverInfection?: boolean
  /** Said by the person: a new or worse symptom for over 24 hours. A declaration, no algorithm reads it. */
  newSymptom?: boolean
  /** 0–10, not validated: sensitivity to noise, light, smells, touch. */
  sensorySensitivity?: number

  weather?: WeatherInfo
  /** What was taken that day, pointing at the Medication registry. */
  intakes?: MedicationIntake[]
  positiveActions?: string[]
  painLocations?: BodyZone[]
  periodDay?: boolean
  notes?: string
}

/** A day on which a pain level was actually given. The analyses (report,
 * flares, trends, reviews) take these only: a day without pain is not a day
 * of no pain, it is a day not logged. */
export type LoggedEntry = DailyEntry & { painLevel: number }

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
// The identifiers are stored in settings and in backups, so they never
// change; the wording does: 'arthrite' stands for rheumatoid arthritis
// (polyarthrite rhumatoïde) and 'spondylarthrite' for spondyloarthritis
// (spondyloarthrite, the current medical spelling).
export type Illness =
  | 'fibromyalgie'
  | 'arthrite'
  | 'spondylarthrite'
  | 'rhumatisme-psoriasique'
  | 'endometriose'
  | 'migraine'
  | 'lombalgie'
  | 'sep'
  | 'myofasciale'
  | 'autre'

export const ILLNESSES: Illness[] = [
  'fibromyalgie',
  'arthrite',
  'spondylarthrite',
  'rhumatisme-psoriasique',
  'endometriose',
  'migraine',
  'lombalgie',
  'sep',
  'myofasciale',
  'autre',
]

/** What the person says of an illness they track: a health professional has
 * confirmed it, or it is only suspected (a diagnosis still being looked for). */
export type IllnessStatus = 'diagnosed' | 'suspected'
export const ILLNESS_STATUSES: IllnessStatus[] = ['diagnosed', 'suspected']

/** The statuses and the typed name that go with the tracked illnesses. */
export interface IllnessDetails {
  /** Per illness, as declared. Nothing is assumed: an illness with no entry is listed with no status. */
  status?: Partial<Record<Illness, IllnessStatus>>
  /** What was typed for "autre", e.g. "Rhumatisme psoriasique". Shown as typed on the report, never on the Kids tab. */
  otherName?: string
  /** The year of the diagnosis, only for an illness declared diagnosed: the date doctors ask for. */
  year?: Partial<Record<Illness, number>>
}

/** Automatic backup on this device: where copies go and how the last one went.
 * Per device, like `lastBackupAt`: not restored from a backup file. */
export interface AutoBackupState {
  provider: 'dropbox' | 'drive' | 'webdav' | 'memory'
  /** The last copy sent, read back and checked. */
  lastCopy?: { name: string; bytes: number; sha256: string; at: number }
  /** The last try, whether or not it worked (ms). */
  lastAttemptAt?: number
  /** Why the last try failed; absent when it worked. */
  lastFailure?: 'auth' | 'network' | 'quota' | 'other' | 'mismatch' | 'unreadable'
  /** What the provider answered, kept to find out what went wrong. Never the person's data. */
  lastFailureDetail?: string
}

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
  /** Statuses by illness, dropped when the illness is unticked. Optional, and a declaration like the list itself: restored from a backup. */
  illnessStatus?: IllnessDetails['status']
  /** The name typed for "autre", at most `OTHER_ILLNESS_NAME_MAX` characters. */
  otherIllnessName?: string
  /** The year each diagnosed illness was diagnosed, when given. Dropped with the status. */
  illnessYear?: IllnessDetails['year']
  /** When a backup was last exported from this device (ms). Not restored
   * from a backup file: it says nothing about this device's next loss. */
  lastBackupAt?: number
  /** The backup reminder stays quiet until then (ms). */
  backupReminderSnoozedUntil?: number
  /** Set once the person has linked a place to keep copies. Per device. */
  autoBackup?: AutoBackupState
  /** The soft message on the day's page when the last days were harder.
   * Switchable, and a preference: restored from a backup. */
  hardDaysCardEnabled: boolean
  /** Pain first, the rest on request, while a flare is under way. Switchable, restored from a backup. */
  lightFormEnabled: boolean
  /** The Kids tab in the tab bar: a page to explain the illness to a child, which not everyone needs. Off until the person says yes (the setup asks), so no answer is a no. A preference, restored from a backup. */
  kidsTabEnabled: boolean
  /** The day the person asked for the full form: it holds for that day only. Per device. */
  fullFormDay?: string
  /** The flare it was last shown for. Per device, like the reminders above. */
  hardDaysSeen?: HardDaysSeen
  /** What the person answered to the leads on Trends ("note it for my appointment", "not really"), by lead. Restored from a backup. */
  leadChoices?: LeadChoices
  /** A card on the day's page, once, when a new lead shows in the notes. Switchable, restored from a backup. */
  leadPromptEnabled: boolean
  /** The Sunday sentence about the gentlest days of the week. Switchable, restored from a backup. */
  weeklySentenceEnabled: boolean
  /** A dot on the Trends tab when a new lead is there. Switchable, restored from a backup. */
  leadDotEnabled: boolean
  /** The offer to try, for a week, an action that goes with softer days. Switchable, restored from a backup. */
  trialsEnabled: boolean
  /** The one-week trial under way, or just over and waiting to be closed. Restored from a backup. */
  leadTrial?: LeadTrial
  /** The weeks the person closed, so the report can say what each showed. Restored from a backup. */
  leadTrialHistory?: LeadTrial[]
  /** What the lead cards have already shown on this device. Per device. */
  leadsSeen?: LeadsSeen
  /** Under "Morning stiffness": also ask how strong it was (0–10). Off until the person says yes. A preference, restored from a backup. */
  morningStiffnessSeverityEnabled: boolean
  /** The invitation to follow new indicators (existing users, banner on the day's page) is over: they added some, or the person is a new one, who chose in the setup. A preference, restored from a backup. */
  indicatorInviteDone: boolean
  /** The banner waits until this day (ISO) after a cross. Restored from a backup. */
  indicatorInviteSnoozeUntil?: string
  /** How many times the cross was pressed, 0 to 2: at 2 the banner does not come back. Restored from a backup. */
  indicatorInviteDismissCount?: number
  /** The notice about the new body zones was seen on this device (shown once, to a journal that holds zones of the first versions). Per device. */
  zonesNoticeSeen?: boolean
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
  hardDaysCardEnabled: true,
  lightFormEnabled: true,
  kidsTabEnabled: false,
  leadPromptEnabled: true,
  weeklySentenceEnabled: true,
  leadDotEnabled: true,
  trialsEnabled: true,
  morningStiffnessSeverityEnabled: false,
  indicatorInviteDone: false,
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
