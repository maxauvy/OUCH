// « Suivi kiné » (early access): the physio sessions and the exercises given for home, as the person notes them. Everything here is counted
// from the journal, never judged: OUCH does not suggest, choose or dose an exercise, and the pain around the sessions is shown as it was noted,
// with no threshold (the studies validate a rule on the next day's pain for tendinopathy only; see docs/soignants/kinesitherapie.md).
//
// - a session is a day marked « Séance de kiné » among the day's actions, or a physio appointment noted in Consultation;
// - the exercises are a habit of « Ce qu'on a décidé » counted by the action « Exercices du kiné »; the evening answer « En partie » counts as
//   half a day in what is done against what was planned: some of the dose was done, so neither a full day nor none (the usual way of counting
//   adherence is the share of the prescribed dose done). The pain on days with and without counts a partial day among the days with.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry, LoggedEntry, PastConsultation, PhysioSeries, Settings } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { mean } from './stats.ts'
import type { Decision } from './decisions.ts'

/** The action of « ce qui a aidé » for a session, in each language (the old « Kiné / soins » became it). */
export const SESSION_LABELS = { fr: 'Séance de kiné', en: 'Physio session' } as const
/** The action for the exercises given for home. */
export const EXERCISES_LABELS = { fr: 'Exercices du kiné', en: 'Physio exercises' } as const

/** Sessions a series can have: what a prescription usually says, and the 8 of direct access. */
export const SERIES_TOTALS = [6, 8, 10, 12, 15, 20] as const
/** Sessions shown around: the last ones before today. */
export const AROUND_SESSIONS = 4
/** Days needed on each side before a mean pain is quoted. */
export const MIN_SIDE = 3

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
export const isSessionLabel = (s: string) => Object.values(SESSION_LABELS).some((l) => tidy(l) === tidy(s))
export const isExercisesLabel = (s: string) => Object.values(EXERCISES_LABELS).some((l) => tidy(l) === tidy(s))

/** The switch is on, and this device has the early access. */
export function physioActive(settings: Pick<Settings, 'physioTracking'> | undefined, earlyAccess: boolean): boolean {
  return earlyAccess && !!settings?.physioTracking
}

const hasSession = (e: Pick<DailyEntry, 'positiveActions'>) => (e.positiveActions ?? []).some(isSessionLabel)
/** The day counts as a day of exercises (done or in part). */
export const exercisesDone = (e: Pick<DailyEntry, 'positiveActions'>) => (e.positiveActions ?? []).some(isExercisesLabel)
/** In part: some of the exercises, half a day. Only when the action is there too (it may have been taken off by hand). */
export const exercisesPart = (e: Pick<DailyEntry, 'positiveActions' | 'physioExercises'>) => e.physioExercises === 'part' && exercisesDone(e)

/** The days of a session, oldest first: the days marked « Séance de kiné » and the physio appointments that took place, up to `to`. */
export function sessionDates(entries: readonly Pick<DailyEntry, 'date' | 'positiveActions'>[], past: readonly PastConsultation[] | undefined, to: string): string[] {
  const days = new Set<string>()
  for (const e of entries) if (e.date <= to && hasSession(e)) days.add(e.date)
  for (const p of past ?? []) if (p.kind === 'kine' && p.date <= to) days.add(p.date)
  return [...days].sort()
}

/** Where the series stands: the sessions since it started (up to today), against those planned. */
export function seriesProgress(series: PhysioSeries | undefined, sessions: readonly string[], today: string): { done: number; total: number; start: string } | null {
  if (!series) return null
  return { done: sessions.filter((d) => d >= series.start && d <= today).length, total: series.total, start: series.start }
}

/** The series kept from a choice of how many sessions: the same start when one runs, otherwise from the earliest of today and the appointment. */
export function withSeriesTotal(current: PhysioSeries | undefined, total: number, today: string, appointment?: string): PhysioSeries {
  if (current) return { ...current, total }
  return { total, start: appointment && appointment < today ? appointment : today }
}

/** The exercises under way: the latest decision, among the appointments up to `to`, counted by the action « Exercices du kiné ». */
export function runningExercises(past: readonly PastConsultation[] | undefined, to: string): { decision: Decision; date: string } | null {
  const list = [...(past ?? [])].filter((p) => p.date <= to).sort((a, b) => b.date.localeCompare(a.date))
  for (const p of list) {
    const decision = p.decisions?.find((d) => d.kind === 'habit' && d.action && isExercisesLabel(d.action))
    if (decision) return { decision, date: p.date }
  }
  return null
}

export interface ExercisesCount {
  /** Days with the exercises, those done in part counted as half. */
  done: number
  /** Of them, the days in part. */
  part: number
  /** Times planned over the stretch, from the times a week (whole weeks only); null when unknown or under a week. */
  planned: number | null
}

/** The exercises done from `from` to `to` (both included), against the times planned. */
export function countExercises(entries: readonly DailyEntry[], from: string, to: string, perWeek: number | undefined): ExercisesCount {
  const days = entries.filter((e) => e.date >= from && e.date <= to && exercisesDone(e))
  const part = days.filter(exercisesPart).length
  const weeks = Math.floor((daysBetween(from, to) + 1) / 7)
  return { done: days.length - part / 2, part, planned: perWeek && weeks > 0 ? perWeek * weeks : null }
}

/** The pain on the days with the exercises (done or in part) and without, over a stretch: null on a side with too few days. */
export function painWithExercises(entries: readonly LoggedEntry[], from: string, to: string): { with: number | null; without: number | null; nWith: number; nWithout: number } {
  const span = entries.filter((e) => e.date >= from && e.date <= to)
  const w = span.filter(exercisesDone)
  const wo = span.filter((e) => !exercisesDone(e))
  return {
    with: w.length >= MIN_SIDE ? mean(w.map((e) => e.painLevel)) : null,
    without: wo.length >= MIN_SIDE ? mean(wo.map((e) => e.painLevel)) : null,
    nWith: w.length,
    nWithout: wo.length,
  }
}

/** The pain noted around each of the last sessions before today: the day before, the day, the day after and two days after (undefined when not noted). */
export function aroundSessions(entries: readonly Pick<DailyEntry, 'date' | 'painLevel'>[], sessions: readonly string[], today: string, count = AROUND_SESSIONS): { date: string; pain: (number | undefined)[] }[] {
  const pain = new Map(entries.filter((e) => e.painLevel !== undefined).map((e) => [e.date, e.painLevel!]))
  return sessions
    .filter((d) => d < today)
    .slice(-count)
    .map((date) => ({ date, pain: [-1, 0, 1, 2].map((o) => { const day = shiftISO(date, o); return day <= today ? pain.get(day) : undefined }) }))
}

/** The stretch the screen for the physio covers: from the last session before today (or the last 7 days when there is none) to today. */
export function sinceLastSession(sessions: readonly string[], today: string): { from: string; session: string | null } {
  const last = [...sessions].filter((d) => d < today).pop() ?? null
  const from = last && daysBetween(last, today) <= 30 ? last : shiftISO(today, -6)
  return { from, session: last && from === last ? last : null }
}

/** The median of the pain over a stretch, as a reference for the days around the sessions: null with fewer than 3 days. */
export function medianPain(entries: readonly LoggedEntry[], from: string, to: string): number | null {
  const v = entries.filter((e) => e.date >= from && e.date <= to).map((e) => e.painLevel).sort((a, b) => a - b)
  if (v.length < 3) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2
}

/** What the reports say of the physio over their period: the sessions, the series, the exercises and the pain with and without them. */
export interface PhysioReport {
  sessions: number
  series: { done: number; total: number; start: string } | null
  therapist?: string
  exercises: { text: string; perWeek?: number; since: string; count: ExercisesCount; pain: ReturnType<typeof painWithExercises> } | null
}

export function physioReport(input: { entries: readonly LoggedEntry[]; allEntries: readonly DailyEntry[]; past: readonly PastConsultation[] | undefined; series: PhysioSeries | undefined; from: string; to: string }): PhysioReport | null {
  const { from, to } = input
  const sessions = sessionDates(input.allEntries, input.past, to)
  const inPeriod = sessions.filter((d) => d >= from).length
  const running = runningExercises(input.past, to)
  // Counted from the day after the exercises were given, or from the start of the period when they were given before it.
  const since = running ? (running.date >= from ? shiftISO(running.date, 1) : from) : from
  const exercises =
    running && since <= to
      ? { text: running.decision.text, perWeek: running.decision.perWeek, since, count: countExercises(input.allEntries, since, to, running.decision.perWeek), pain: painWithExercises(input.entries, since, to) }
      : null
  if (!inPeriod && !exercises) return null
  const therapist = [...(input.past ?? [])].filter((p) => p.kind === 'kine' && p.doctor).sort((a, b) => b.date.localeCompare(a.date))[0]?.doctor
  return { sessions: inPeriod, series: seriesProgress(input.series, sessions, to), ...(therapist ? { therapist } : {}), exercises }
}
