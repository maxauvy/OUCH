// Preparing a medical appointment: its date, the person's questions, what
// they most want to say, and, once it has taken place, a note on what was
// said. Nothing here is computed from the journal and nothing says what to
// do: the page only keeps what the person writes, and the report repeats it.

import type { Consultation, LastConsultation, Settings } from '../db/types.ts'
import type { FlareEpisode } from './flares.ts'
import type { ResolvedFlare } from './markedFlares.ts'
import type { TreatmentEvent } from './treatmentEvents.ts'
import { daysBetween } from './dates.ts'

export const MAX_QUESTIONS = 20
export const MAX_QUESTION_LENGTH = 200
export const MAX_GOAL_LENGTH = 300
export const MAX_NOTES_LENGTH = 2_000

/** The card on the day's page appears this many days before the appointment. */
export const CARD_WINDOW_DAYS = 14
/** …and stays this many days after it, for the note on what was said. */
export const AFTER_WINDOW_DAYS = 14

export type ConsultationCardKind = 'soon' | 'after'

/** Which card the day's page shows, if any: a few days before ("soon") or from
 * the day itself ("after"). Closing one hides that card for that appointment;
 * the other one still comes. */
export function consultationCard(
  settings: Pick<Settings, 'consultation' | 'consultationCardClosed'>,
  today: string
): ConsultationCardKind | null {
  const c = settings.consultation
  if (!c) return null
  const days = daysBetween(today, c.date)
  const kind: ConsultationCardKind | null = days > CARD_WINDOW_DAYS ? null : days >= 1 ? 'soon' : days >= -AFTER_WINDOW_DAYS ? 'after' : null
  if (!kind) return null
  const closed = settings.consultationCardClosed
  return closed && closed.date === c.date && closed.kind === kind ? null : kind
}

/** Days until the appointment: 0 the day itself, negative once it has passed. */
export function daysUntil(c: Consultation, today: string): number {
  return daysBetween(today, c.date)
}

/** A line typed by the person: trimmed, cut to the limit, empty if blank. */
export function cleanLine(s: string, max = MAX_QUESTION_LENGTH): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max)
}

export function newConsultation(date: string): Consultation {
  return { date, questions: [] }
}

export function addQuestion(c: Consultation, text: string): Consultation {
  const q = cleanLine(text)
  if (!q || c.questions.length >= MAX_QUESTIONS || c.questions.includes(q)) return c
  return { ...c, questions: [...c.questions, q] }
}

export function removeQuestion(c: Consultation, index: number): Consultation {
  return { ...c, questions: c.questions.filter((_, i) => i !== index) }
}

export function withGoal(c: Consultation, text: string): Consultation {
  const goal = cleanLine(text, MAX_GOAL_LENGTH)
  const { goal: _old, ...rest } = c
  return goal ? { ...rest, goal } : rest
}

/** What the appointment became: remembered as the last one (its date starts
 * the next report), with the person's note, and nothing planned any more. */
export function finishConsultation(settings: Settings, notes: string): Partial<Settings> {
  const c = settings.consultation
  if (!c) return {}
  const note = notes.trim().slice(0, MAX_NOTES_LENGTH)
  const last: LastConsultation = note ? { date: c.date, notes: note } : { date: c.date }
  return { lastConsultation: last, consultation: undefined, consultationCardClosed: undefined }
}

/** The report's "what I want to bring up" lines, filled from what was prepared:
 * the questions, then what the person most wants to say. */
export function agendaLines(c: Consultation | undefined, goalPrefix: string): string[] {
  if (!c) return []
  return [...c.questions, ...(c.goal ? [`${goalPrefix} ${c.goal}`] : [])]
}

/** The day the next report starts from by default: the last appointment, if
 * there was one; otherwise `fallback`. */
export function reportStart(settings: Pick<Settings, 'lastConsultation'>, today: string, fallback: string): string {
  const last = settings.lastConsultation?.date
  return last && last <= today ? last : fallback
}

/** Logged days needed on a side before its mean pain is quoted. */
export const MIN_SINCE_DAYS = 3

export interface SinceLast {
  /** Mean pain from the last appointment to today, and over the same number of days before it. */
  now: number
  before: number | null
}

/** The pain since the last appointment, set beside the stretch of the same
 * length before it: two means and no verdict (the report says how much two
 * stretches usually differ). Null when too few days were logged to say. */
export function sinceLast(entries: readonly { date: string; painLevel: number }[], lastDate: string, today: string): SinceLast | null {
  const length = daysBetween(lastDate, today)
  if (length < 1) return null
  const mean = (list: readonly { painLevel: number }[]) => list.reduce((s, e) => s + e.painLevel, 0) / list.length
  const now = entries.filter((e) => e.date >= lastDate && e.date <= today)
  if (now.length < MIN_SINCE_DAYS) return null
  const prev = entries.filter((e) => daysBetween(e.date, lastDate) > 0 && daysBetween(e.date, lastDate) <= length)
  return { now: mean(now), before: prev.length >= MIN_SINCE_DAYS ? mean(prev) : null }
}

export interface SinceFacts {
  /** Flares OUCH detected that touch the stretch. */
  detected: number
  /** Periods the person marked that touch it. */
  marked: number
  /** Starts, dose changes and stops of a treatment inside it, oldest first. */
  treatments: TreatmentEvent[]
}

/** What happened since the last appointment, as a few counts and dated events: no reading, nothing to compare. */
export function sinceFacts(input: { from: string; to: string; flares: readonly FlareEpisode[]; marked: readonly ResolvedFlare[]; events: readonly TreatmentEvent[] }): SinceFacts {
  const { from, to } = input
  return {
    detected: input.flares.filter((e) => e.end >= from && e.start <= to).length,
    marked: input.marked.filter((m) => m.last >= from && m.start <= to).length,
    treatments: input.events.filter((e) => e.date >= from && e.date <= to),
  }
}
