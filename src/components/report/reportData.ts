import type { DailyEntry, Medication } from '../../db/types'
import type { Language } from '../../i18n'
import { medicationReports, painStats, reportPeriods, splitEntries, type MedicationReport, type PainStats, type ReportPeriods, type SymptomKey } from '../../lib/report'
import { reportFormat, type ReportFormat } from './reportFormat'

export type ReportVariant = 'gp' | 'painClinic'

export interface ReportOptions {
  variant: ReportVariant
  language: Language
  /** Date of the last consultation: start of the reported period */
  consultation: string
  /** Last day covered (today) */
  end: string
  patientName: string
  birthDate?: string
  agenda: string[]
  includeNotes: boolean
  includeCycle: boolean
}

// Symptom scales shown next to pain: which way is "better", and the top of the scale.
export const SYMPTOMS: { key: SymptomKey; better: 1 | -1; max: number }[] = [
  { key: 'fatigueLevel', better: -1, max: 10 },
  { key: 'sleepQuality', better: 1, max: 10 },
  { key: 'sleepHours', better: 1, max: 12 },
  { key: 'brainFog', better: -1, max: 10 },
  { key: 'moodLevel', better: 1, max: 10 },
  { key: 'stressLevel', better: -1, max: 10 },
  { key: 'activityLevel', better: 1, max: 10 },
]

export interface ReportData {
  options: ReportOptions
  f: ReportFormat
  p: ReportPeriods
  /** Both periods together, for charts and associations */
  all: DailyEntry[]
  current: DailyEntry[]
  previous: DailyEntry[]
  pain: PainStats | null
  painPrev: PainStats | null
  meds: MedicationReport[]
  medications: Medication[]
}

export function buildReportData(entries: DailyEntry[], medications: Medication[], options: ReportOptions): ReportData {
  const p = reportPeriods(options.consultation, options.end)
  const { current, previous } = splitEntries(entries, p)
  return {
    options,
    f: reportFormat(options.language),
    p,
    all: [...previous, ...current],
    current,
    previous,
    pain: painStats(current),
    painPrev: painStats(previous),
    meds: medicationReports(current, medications, p),
    medications,
  }
}

