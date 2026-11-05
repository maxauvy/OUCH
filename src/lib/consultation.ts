// Preparing a medical appointment: its date, the person's questions, what
// they most want to say, and, once it has taken place, a note on what was
// said. Nothing here is computed from the journal and nothing says what to
// do: the page only keeps what the person writes, and the report repeats it.

import type { Consultation, ConsultationKind, PastConsultation, Settings } from '../db/types.ts'
import type { FlareEpisode } from './flares.ts'
import type { ResolvedFlare } from './markedFlares.ts'
import type { TreatmentEvent } from './treatmentEvents.ts'
import { daysBetween } from './dates.ts'

export const MAX_QUESTIONS = 20
export const MAX_QUESTION_LENGTH = 200
export const MAX_GOAL_LENGTH = 300
export const MAX_NOTES_LENGTH = 2_000
export const MAX_DOCTOR_LENGTH = 60
/** How many past appointments are kept, by kind: a family doctor is seen more often than a pain clinic, whose last two visits are what a report is compared with. */
export const MAX_PAST_BY_KIND: Record<ConsultationKind, number> = { gp: 6, cetd: 2 }

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

/** The kind of an appointment: the family doctor's when it was noted before the kinds existed. */
export function kindOf(c: Pick<Consultation, 'kind'> | undefined): ConsultationKind {
  return c?.kind ?? 'gp'
}

/** The name of the professional, as a clean line (empty if blank). */
export function cleanDoctor(s: string | undefined): string | undefined {
  const name = s ? cleanLine(s, MAX_DOCTOR_LENGTH) : ''
  return name || undefined
}

/** The appointments that took place, newest first: the list, plus the single "last appointment" of the first version when it is not in it (read as a family doctor's). */
/** The past appointments newest first, within the cap of each kind. */
export function capPast(list: readonly PastConsultation[]): PastConsultation[] {
  const seen: Record<ConsultationKind, number> = { gp: 0, cetd: 0 }
  return [...list]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((p) => ++seen[p.kind] <= MAX_PAST_BY_KIND[p.kind])
}

export function pastConsultations(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>): PastConsultation[] {
  const list = [...(settings.pastConsultations ?? [])]
  const legacy = settings.lastConsultation
  if (legacy && !list.some((p) => p.date === legacy.date && p.kind === 'gp')) {
    list.push({ date: legacy.date, kind: 'gp', ...(legacy.notes ? { notes: legacy.notes } : {}) })
  }
  return list.sort((a, b) => b.date.localeCompare(a.date))
}

/** The last appointment that took place, of a kind (or of any kind). */
export function lastOf(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>, kind?: ConsultationKind): PastConsultation | undefined {
  return pastConsultations(settings).find((p) => !kind || p.kind === kind)
}

/** The appointment of a kind just before a day: the one that bounds the period compared with the one starting on it. */
export function previousOf(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>, kind: ConsultationKind, before: string): PastConsultation | undefined {
  return pastConsultations(settings).find((p) => p.kind === kind && p.date < before)
}

/** An appointment that took place, kept (the same day and kind is kept once, the new one winning), newest first, within the cap. */
export function withPast(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>, entry: PastConsultation): Partial<Settings> {
  const doctor = cleanDoctor(entry.doctor)
  const notes = entry.notes?.trim().slice(0, MAX_NOTES_LENGTH)
  const questions = (entry.questions ?? []).map((q) => cleanLine(q)).filter(Boolean).slice(0, MAX_QUESTIONS)
  const goal = cleanLine(entry.goal ?? '', MAX_GOAL_LENGTH)
  const clean: PastConsultation = {
    date: entry.date,
    kind: entry.kind,
    ...(doctor ? { doctor } : {}),
    ...(notes ? { notes } : {}),
    ...(questions.length ? { questions } : {}),
    ...(goal ? { goal } : {}),
  }
  const rest = pastConsultations(settings).filter((p) => !(p.date === clean.date && p.kind === clean.kind))
  const merged = capPast([clean, ...rest])
  // The single "last appointment" of the first version is in the list now.
  return { pastConsultations: merged, lastConsultation: undefined }
}

/** What the appointment became: remembered among the past ones (its date starts the next report of its kind), with the person's note, and nothing planned any more. */
export function finishConsultation(settings: Settings, notes: string): Partial<Settings> {
  const c = settings.consultation
  if (!c) return {}
  const entry: PastConsultation = { date: c.date, kind: kindOf(c), ...(c.doctor ? { doctor: c.doctor } : {}), ...(notes.trim() ? { notes } : {}), questions: c.questions, ...(c.goal ? { goal: c.goal } : {}) }
  return { ...withPast(settings, entry), consultation: undefined, consultationCardClosed: undefined }
}

/** The report's "what I want to bring up" lines, filled from what was prepared:
 * the questions, then what the person most wants to say. */
export function agendaLines(c: Consultation | undefined, goalPrefix: string): string[] {
  if (!c) return []
  return [...c.questions, ...(c.goal ? [`${goalPrefix} ${c.goal}`] : [])]
}

/** The day the next report of a kind starts from by default: the last appointment of that kind, if there was one; otherwise `fallback`. */
export function reportStart(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>, today: string, fallback: string, kind: ConsultationKind): string {
  const last = lastOf(settings, kind)?.date
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

/** An appointment that took place, with its note changed (or cleared): the same one, kept in place. */
export function withPastNote(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>, date: string, kind: ConsultationKind, notes: string): Partial<Settings> {
  const found = pastConsultations(settings).find((p) => p.date === date && p.kind === kind)
  if (!found) return {}
  const { notes: _old, ...rest } = found
  return withPast(settings, { ...rest, ...(notes.trim() ? { notes } : {}) })
}

/** An appointment that took place, forgotten. */
export function withoutPast(settings: Pick<Settings, 'pastConsultations' | 'lastConsultation'>, date: string, kind: ConsultationKind): Partial<Settings> {
  return { pastConsultations: pastConsultations(settings).filter((p) => !(p.date === date && p.kind === kind)), lastConsultation: undefined }
}
