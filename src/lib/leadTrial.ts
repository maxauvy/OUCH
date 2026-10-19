// A one-week trial of something the person can choose to do (an action they
// note under "what helped"): they say yes, carry on as usual, and a week later
// the days with it are set beside the other days. It describes seven days; it
// says so, and it does not say the action works.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import { actionKey, type Lead } from './leads.ts'
import { shiftISO } from './medications.ts'

export const TRIAL_DAYS = 7
/** Days of each sort (with, without) before the two are compared. */
export const TRIAL_MIN_GROUP = 2

/** The trial under way (or just over, waiting for the person to close it). */
export interface LeadTrial {
  /** The lead it started from: 'action:<name>' */
  key: string
  /** The action, as the person wrote it first */
  action: string
  /** First and last day of the week, as dates */
  start: string
  end: string
}

/** Only an action can be tried: sleep, stress or yesterday's activity are not a choice made for a week. */
export function startTrial(lead: Lead, today: string): LeadTrial | null {
  if (lead.kind !== 'action' || !lead.action) return null
  return { key: lead.key, action: lead.action, start: today, end: shiftISO(today, TRIAL_DAYS - 1) }
}

/** "Do it again": a new week from today for an action tried before. */
export function restartTrial(trial: LeadTrial, today: string): LeadTrial {
  return { key: trial.key, action: trial.action, start: today, end: shiftISO(today, TRIAL_DAYS - 1) }
}

/** "Carry on for another week": a new week from today, the same action. */
export function continueTrial(trial: LeadTrial, today: string): LeadTrial {
  return { ...trial, start: today, end: shiftISO(today, TRIAL_DAYS - 1) }
}

interface TrialDay {
  date: string
  state: 'with' | 'without' | 'unlogged' | 'future'
}

interface TrialResult {
  with: { mean: number; n: number }
  without: { mean: number; n: number }
  /** with.mean − without.mean */
  gap: number
  /** Same way as the lead it started from; null when either has no direction */
  sameDirection: boolean | null
}

interface TrialStatus {
  /** The week is over: today is after its last day */
  over: boolean
  /** Day of the week we are on, 1 to 7 */
  day: number
  days: TrialDay[]
  /** Days of the week where the action was noted */
  withDays: number
  /** Null until the week is over, or when there are too few days of one sort */
  result: TrialResult | null
  /** The week is over but a comparison would rest on too few days */
  tooFew: boolean
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

export function trialStatus(
  trial: LeadTrial,
  entries: LoggedEntry[],
  today: string,
  /** The lead's gap when the trial started, to say if the week goes the same way */
  leadGap?: number
): TrialStatus {
  const key = actionKey(trial.action)
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const days: TrialDay[] = Array.from({ length: TRIAL_DAYS }, (_, i) => {
    const date = shiftISO(trial.start, i)
    const entry = byDate.get(date)
    const state: TrialDay['state'] =
      date > today ? 'future' : !entry ? 'unlogged' : (entry.positiveActions ?? []).some((a) => actionKey(a) === key) ? 'with' : 'without'
    return { date, state }
  })
  const over = today > trial.end
  const pain = (state: TrialDay['state']) => days.filter((d) => d.state === state).map((d) => byDate.get(d.date)!.painLevel)
  const withPain = pain('with')
  const withoutPain = pain('without')
  const comparable = over && withPain.length >= TRIAL_MIN_GROUP && withoutPain.length >= TRIAL_MIN_GROUP
  let result: TrialResult | null = null
  if (comparable) {
    const gap = mean(withPain) - mean(withoutPain)
    result = {
      with: { mean: mean(withPain), n: withPain.length },
      without: { mean: mean(withoutPain), n: withoutPain.length },
      gap,
      sameDirection: leadGap === undefined || gap === 0 || leadGap === 0 ? null : Math.sign(gap) === Math.sign(leadGap),
    }
  }
  const elapsed = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${trial.start}T12:00:00Z`)) / 86_400_000) + 1
  return {
    over,
    day: Math.min(TRIAL_DAYS, Math.max(1, elapsed)),
    days,
    withDays: withPain.length,
    result,
    tooFew: over && !comparable,
  }
}

/** Weeks closed by the person, kept so the report can say what each showed. */
export const MAX_TRIAL_HISTORY = 30

/** `history` with `trial` added once (the same action from the same day is the same week), the oldest dropped past a cap. */
export function archiveTrial(history: LeadTrial[] | undefined, trial: LeadTrial): LeadTrial[] {
  const rest = (history ?? []).filter((t) => !(t.key === trial.key && t.start === trial.start))
  return [...rest, trial].slice(-MAX_TRIAL_HISTORY)
}

/** The leads a trial was made of, under way or closed: what the day's page does not bring as a lead. */
export function triedKeys(current: LeadTrial | undefined, history: LeadTrial[] | undefined): string[] {
  return [...new Set([...(current ? [current.key] : []), ...(history ?? []).map((t) => t.key)])]
}

export interface ReportTrial {
  trial: LeadTrial
  result: TrialResult
}

/** The weeks that ended between `from` and `to` and can be compared, for the
 * report: the closed ones, and the current one if it is over but not closed.
 * Computed on the diary as it reads today, like the rest of the report. A week
 * whose last day is the report's last day is not over yet, so it comes in the
 * next report: that day is still being lived and logged. */
export function reportTrials(
  history: LeadTrial[] | undefined,
  current: LeadTrial | undefined,
  entries: LoggedEntry[],
  from: string,
  to: string
): ReportTrial[] {
  const all = archiveTrialsWith(history, current)
  const out: ReportTrial[] = []
  for (const trial of all) {
    if (trial.end < from || trial.end > to) continue
    const { result } = trialStatus(trial, entries, to)
    if (result) out.push({ trial, result })
  }
  return out.sort((a, b) => a.trial.end.localeCompare(b.trial.end))
}

function archiveTrialsWith(history: LeadTrial[] | undefined, current: LeadTrial | undefined): LeadTrial[] {
  return current ? archiveTrial(history, current) : (history ?? [])
}
