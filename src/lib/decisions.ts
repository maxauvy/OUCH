// « Ce qu'on a décidé »: one or two decisions noted after an appointment, and what the journal shows since each one. The decisions are the
// person's own words; what follows each one is counted, never judged: the report says what moved, not that the decision worked (the season,
// a return towards the mean or another change can move the figures too).
//
// - a treatment, tied to the registry: the mean pain over the 28 days before the decision and over the 28 days after its settling-in days
//   (the treatment's own, 7 when absent), as in the before-and-after review; and the days a side effect of it was noted since;
// - a habit, tied to an action of « ce qui a aidé »: how many days it was noted since, against the times planned, and the mean pain on the
//   days with and without it;
// - a trial, suggested by the doctor and drawn like any other (lib/leadTrial.ts): where it stands, or its result;
// - an exam or anything else: the sentence only.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry, Medication, PastConsultation } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { mean } from './stats.ts'
import { trialStatus, type LeadTrial, type TrialStatus } from './leadTrial.ts'
import { exercisesPart } from './physio.ts'
import { currentLabel } from './renamedSuggestions.ts'

export const DECISION_KINDS = ['treatment', 'habit', 'trial', 'exam', 'other'] as const
export type DecisionKind = (typeof DECISION_KINDS)[number]

export interface Decision {
  kind: DecisionKind
  /** The decision in the person's words. */
  text: string
  /** A habit or a trial: the action of « ce qui a aidé » it is about. */
  action?: string
  /** A habit: the times a week planned. */
  perWeek?: number
  /** A treatment: the registry entry it is about. */
  medicationId?: string
}

export const MAX_DECISIONS = 4
export const MAX_DECISION_LENGTH = 140
export const PER_WEEK = [1, 2, 3, 5, 7] as const
const WINDOW = 28
const DEFAULT_SETTLE = 7
/** Logged days needed on each side before a mean is quoted. */
export const MIN_SIDE = 5

const line = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** The decisions as stored or restored: known kinds, a sentence, and only the details that fit their kind. */
export function cleanDecisions(raw: unknown): Decision[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: Decision[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const d = r as Record<string, unknown>
    if (!(DECISION_KINDS as readonly unknown[]).includes(d.kind)) continue
    const kind = d.kind as DecisionKind
    // An action of « ce qui a aidé » under its current wording (« Kiné / soins » became « Séance de kiné »), and the sentence with it when it was only the action.
    const rawAction = kind === 'habit' || kind === 'trial' ? line(d.action, 80) : ''
    const action = rawAction && currentLabel(rawAction)
    const rawText = line(d.text, MAX_DECISION_LENGTH)
    const text = rawText && rawAction && rawText === rawAction ? action : rawText
    if ((!text && !action) || (kind === 'trial' && !action)) continue
    const perWeek = kind === 'habit' && (PER_WEEK as readonly unknown[]).includes(d.perWeek) ? (d.perWeek as number) : undefined
    const medicationId = kind === 'treatment' && typeof d.medicationId === 'string' && d.medicationId ? d.medicationId : undefined
    out.push({ kind, text: text || action, ...(action ? { action } : {}), ...(perWeek ? { perWeek } : {}), ...(medicationId ? { medicationId } : {}) })
    if (out.length === MAX_DECISIONS) break
  }
  return out.length ? out : undefined
}

/** The last appointment, up to `to`, that has decisions: the one a report or the day's page follows up. */
export function lastDecided(past: readonly PastConsultation[] | undefined, to: string): PastConsultation | null {
  return [...(past ?? [])].filter((p) => p.date <= to && p.decisions?.length).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}

export type DecisionFollow =
  | { kind: 'treatment'; decision: Decision; name?: string; before: { mean: number; n: number } | null; after: { mean: number; n: number } | null; settleDays: number; effectDays: number; effects: string[] }
  | { kind: 'habit'; decision: Decision; /** Days with the action, a day of physio exercises done in part counted as half. */ done: number; /** Of them, the days in part. */ part: number; planned: number | null; withMean: number | null; withoutMean: number | null; withDays: number; withoutDays: number }
  | { kind: 'trial'; decision: Decision; trial: LeadTrial | null; status: TrialStatus | null }
  | { kind: 'note'; decision: Decision }

const sameAction = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

/** What the journal shows since the appointment of `date`, up to `to`, for each decision. */
export function followDecisions(decisions: readonly Decision[], date: string, to: string, entries: readonly LoggedEntry[], medications: readonly Medication[], trials: readonly LeadTrial[] = []): DecisionFollow[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const between = (from: string, until: string) => sorted.filter((e) => e.date >= from && e.date <= until)
  const side = (list: LoggedEntry[]) => (list.length >= MIN_SIDE ? { mean: mean(list.map((e) => e.painLevel)), n: list.length } : null)
  const since = between(shiftISO(date, 1), to)

  return decisions.map((decision): DecisionFollow => {
    if (decision.kind === 'treatment' && decision.medicationId) {
      const med = medications.find((m) => m.id === decision.medicationId)
      const settleDays = med?.settleDays ?? DEFAULT_SETTLE
      const before = side(between(shiftISO(date, -WINDOW), shiftISO(date, -1)))
      const afterFrom = shiftISO(date, settleDays + 1)
      const afterTo = shiftISO(afterFrom, WINDOW - 1)
      const after = side(between(afterFrom, afterTo < to ? afterTo : to))
      const effects = new Map<string, string>()
      let effectDays = 0
      for (const e of since) {
        const noted = (e.intakes ?? []).filter((i) => i.medicationId === decision.medicationId).flatMap((i) => i.sideEffects ?? []).map((s) => s.trim()).filter(Boolean)
        if (noted.length) effectDays++
        for (const s of noted) if (!effects.has(s.toLocaleLowerCase())) effects.set(s.toLocaleLowerCase(), s)
      }
      return { kind: 'treatment', decision, name: med?.name, before, after, settleDays, effectDays, effects: [...effects.values()].slice(0, 3) }
    }
    if (decision.kind === 'habit' && decision.action) {
      const has = (e: LoggedEntry) => (e.positiveActions ?? []).some((a) => sameAction(a, decision.action!))
      const withDays = since.filter(has)
      const withoutDays = since.filter((e) => !has(e))
      const weeks = Math.floor((daysBetween(date, to) + 0) / 7)
      const part = withDays.filter(exercisesPart).length
      return {
        kind: 'habit',
        decision,
        done: withDays.length - part / 2,
        part,
        planned: decision.perWeek && weeks > 0 ? decision.perWeek * weeks : null,
        withMean: withDays.length >= 3 ? mean(withDays.map((e) => e.painLevel)) : null,
        withoutMean: withoutDays.length >= 3 ? mean(withoutDays.map((e) => e.painLevel)) : null,
        withDays: withDays.length,
        withoutDays: withoutDays.length,
      }
    }
    if (decision.kind === 'trial' && decision.action) {
      // The first trial of that action that started after the appointment.
      const trial = [...trials].filter((t) => t.start > date && sameAction(t.action, decision.action!)).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
      return { kind: 'trial', decision, trial, status: trial && trial.start <= to ? trialStatus(trial, sorted, to) : null }
    }
    return { kind: 'note', decision }
  })
}
