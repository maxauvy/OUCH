// The journal as plain CSV, for a spreadsheet or an analysis tool: standard
// UTF-8, commas, decimal points, CRLF line ends (RFC 4180), column names that
// do not depend on the app's language. Two files, so neither needs columns
// that change with the treatments: one row per day, one row per intake.
// Unlike the encrypted backup it cannot restore OUCH, and it is not encrypted.

import type { DailyEntry, Medication } from '../db/types.ts'
import { periodOn } from './medications.ts'

interface CsvOptions {
  /** The free-text note of each day; off, the column is left out */
  includeNotes: boolean
}

const JOURNAL_COLUMNS = [
  'date',
  'pain',
  'fatigue',
  'sleep_quality',
  'sleep_hours',
  'stress',
  'brain_fog',
  'mood',
  'activity',
  'period_day',
  'weather_source',
  'weather_condition',
  'temperature_c',
  'pressure_hpa',
  'pain_locations',
  'positive_actions',
  'morning_stiffness',
  'morning_stiffness_severity',
  'night_wakings',
  'daily_interference',
  'waking_refreshed',
  'joints_felt',
  'joint_areas',
  'period_flow',
  'off_cycle_bleeding',
  'bowel_pain',
  'urinary',
  'headache',
  'headache_duration',
  'headache_aura',
  'headache_nausea',
  'headache_sensitivity',
  'headache_triggers',
  'headache_acute_med',
  'notes',
] as const

const INTAKE_COLUMNS = [
  'date',
  'medication',
  'medication_id',
  'regimen',
  'dose_amount',
  'dose_unit',
  'doses',
  'taken',
  'relief',
  'side_effects',
] as const

type Cell = string | number | boolean | undefined

/** Several values in one cell, told apart by a bar (a comma would be quoted). */
const LIST_SEPARATOR = '|'

/**
 * One cell. Text that begins like a formula (= + - @ or a tab) gets a leading
 * apostrophe, so a spreadsheet shows it rather than computing it: a note is
 * free text and the file is meant to be opened. Numbers and booleans are
 * never touched (a temperature can be negative). Quoted when it holds a comma,
 * a quote or a line break, with the quotes doubled.
 */
export function csvCell(value: Cell): string {
  if (value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? '1' : '0'
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const line = (cells: Cell[]) => cells.map(csvCell).join(',')
const lines = (rows: Cell[][]) => rows.map(line).join('\r\n') + '\r\n'
const byDate = (a: DailyEntry, b: DailyEntry) => a.date.localeCompare(b.date)

/** One row per day with something noted, oldest first. An empty cell is "not
 * noted": a day without a pain level is not a day of pain 0. */
export function journalCsv(entries: DailyEntry[], options: CsvOptions): string {
  const columns = JOURNAL_COLUMNS.filter((c) => options.includeNotes || c !== 'notes')
  const rows: Cell[][] = [[...columns]]
  for (const e of [...entries].sort(byDate)) {
    const cells: Record<(typeof JOURNAL_COLUMNS)[number], Cell> = {
      date: e.date,
      pain: e.painLevel,
      fatigue: e.fatigueLevel,
      sleep_quality: e.sleepQuality,
      sleep_hours: e.sleepHours,
      stress: e.stressLevel,
      brain_fog: e.brainFog,
      mood: e.moodLevel,
      activity: e.activityLevel,
      period_day: e.periodDay,
      weather_source: e.weather?.source,
      weather_condition: e.weather?.condition,
      temperature_c: e.weather?.tempC,
      pressure_hpa: e.weather?.pressureHpa,
      pain_locations: e.painLocations?.join(LIST_SEPARATOR),
      positive_actions: e.positiveActions?.join(LIST_SEPARATOR),
      morning_stiffness: e.morningStiffness,
      morning_stiffness_severity: e.morningStiffnessSeverity,
      night_wakings: e.nightWakings,
      daily_interference: e.dailyInterference,
      waking_refreshed: e.wakingRefreshed,
      joints_felt: e.jointsFelt?.yes,
      joint_areas: e.jointsFelt?.joints?.join(LIST_SEPARATOR),
      period_flow: e.periodFlow,
      off_cycle_bleeding: e.offCycleBleeding,
      bowel_pain: e.bowelPain,
      urinary: e.urinary,
      headache: e.headache?.today,
      headache_duration: e.headache?.duration,
      headache_aura: e.headache?.aura,
      headache_nausea: e.headache?.nausea,
      headache_sensitivity: e.headache?.sensitivity,
      headache_triggers: e.headache?.triggers?.join(LIST_SEPARATOR),
      headache_acute_med: e.headache?.acuteMed,
      notes: e.notes,
    }
    rows.push(columns.map((c) => cells[c]))
  }
  return lines(rows)
}

/** One row per intake, oldest first, with the posology in force that day.
 * `doses` is what was recorded (empty: taken, number not recorded; 0: a dose
 * missed); `taken` is 0 only for a recorded 0. */
export function intakesCsv(entries: DailyEntry[], medications: Medication[]): string {
  const byId = new Map(medications.map((m) => [m.id, m]))
  const rows: Cell[][] = [[...INTAKE_COLUMNS]]
  for (const e of [...entries].sort(byDate)) {
    for (const intake of e.intakes ?? []) {
      const med = byId.get(intake.medicationId)
      const period = med && med.regimen !== 'unspecified' ? periodOn(med, e.date) : undefined
      rows.push([
        e.date,
        med?.name,
        intake.medicationId,
        med?.regimen,
        period?.dose?.amount,
        period?.dose?.unit,
        intake.doses,
        intake.doses !== 0,
        intake.relief,
        intake.sideEffects?.join(LIST_SEPARATOR),
      ])
    }
  }
  return lines(rows)
}
