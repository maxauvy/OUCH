// A trial of something the person can choose to do (an action they note under
// "what helped").
//
// The days are drawn: ten days, five with the action and five
// without, in an order the person learns one evening at a time. Left to choose,
// a person turns to the action on the days that hurt, so the days with it are
// the hard ones and the comparison says nothing about the action; a draw made
// before the day is known breaks that link (see the methodological note). The
// result sets the days with beside the days without, on the day and on the next
// day. A day without on which the person needed the action anyway (a "rescue"
// day) stays among the days without: that can only make the action look less
// helpful, never more.
//
// Trials started before the draw came in (no `plan`) were weeks of seven days where the
// person noted the action when they could; they are still read as they were.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import { actionKey, type Lead } from './leads.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { mean } from './stats.ts'

/** Length of a trial started before the draw: a week, the action noted when the person could. */
export const TRIAL_DAYS = 7
/** Days of each sort (with, without) before such a week is compared. */
export const TRIAL_MIN_GROUP = 2
/** A drawn trial: ten days, half of them with the action. */
export const DRAWN_DAYS = 10
/** Logged days of each sort before a drawn trial is compared, on the day and on the next day. */
export const DRAWN_MIN_GROUP = 3

/** What the draw gave a day of the trial. */
export type TrialArm = 'with' | 'without'

/** The trial under way (or just over, waiting for the person to close it). */
export interface LeadTrial {
  /** The lead it started from: 'action:<name>' */
  key: string
  /** The action, as the person wrote it first */
  action: string
  /** First and last day, as dates */
  start: string
  end: string
  /** The draw, one arm per day from `start`. Absent: a week where the person chose the days. */
  plan?: TrialArm[]
  /** Suggested by the doctor at an appointment (« Ce qu'on a décidé »): said on the trial's card and in the report. */
  byDoctor?: true
}

/** Half the days with the action, half without, in an order drawn at random (Fisher–Yates). */
export function drawPlan(random: () => number = Math.random, length = DRAWN_DAYS): TrialArm[] {
  const plan: TrialArm[] = Array.from({ length }, (_, i) => (i < length / 2 ? 'with' : 'without'))
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[plan[i], plan[j]] = [plan[j], plan[i]]
  }
  return plan
}

/** A drawn trial of an action, from tomorrow: the person learns tomorrow's day as soon as they say yes. */
export function newTrial(key: string, action: string, today: string, random: () => number = Math.random): LeadTrial {
  const start = shiftISO(today, 1)
  return { key, action, start, end: shiftISO(start, DRAWN_DAYS - 1), plan: drawPlan(random) }
}

/** Only an action can be tried: sleep, stress or yesterday's activity are not a choice made for ten days. */
export function startTrial(lead: Lead, today: string, random?: () => number): LeadTrial | null {
  if (lead.kind !== 'action' || !lead.action) return null
  return newTrial(lead.key, lead.action, today, random)
}

/** "Do it again": a new drawn trial from tomorrow, for an action tried before. */
export function restartTrial(trial: LeadTrial, today: string, random?: () => number): LeadTrial {
  return newTrial(trial.key, trial.action, today, random)
}

export interface TrialDay {
  date: string
  state: 'with' | 'without' | 'unlogged' | 'future'
  /** Drawn trials: what the draw gave the day */
  arm?: TrialArm
  /** Drawn trials: the day's arm can be shown (a past day, today, or tomorrow once today is logged) */
  revealed?: boolean
  /** Drawn trials: a day without on which the action was noted all the same */
  rescue?: boolean
}

export interface Comparison {
  with: { mean: number; n: number }
  without: { mean: number; n: number }
  /** with.mean − without.mean */
  gap: number
}

export interface TrialResult extends Comparison {
  /** Same way as the lead it started from; null when either has no direction. Older weeks only. */
  sameDirection: boolean | null
  /** Drawn trials: the pain on the next day, after a day with and after a day without; null with too few pairs */
  next?: Comparison | null
  /** Drawn trials: rescue days, kept among the days without */
  rescues?: number
}

export interface TrialStatus {
  /** The days were drawn */
  drawn: boolean
  /** Days in the trial: 10, or 7 for an older week */
  length: number
  /** The trial is over: today is after its last day */
  over: boolean
  /** Day of the trial we are on, 1 to `length`; 0 the day before a drawn trial starts */
  day: number
  days: TrialDay[]
  /** Days logged with the action (drawn: days drawn "with" and logged) */
  withDays: number
  /** Null until the trial is over, or when there are too few days of one sort */
  result: TrialResult | null
  /** The trial is over but a comparison would rest on too few days */
  tooFew: boolean
}

function compare(withPain: number[], withoutPain: number[]): Comparison {
  return {
    with: { mean: mean(withPain), n: withPain.length },
    without: { mean: mean(withoutPain), n: withoutPain.length },
    gap: mean(withPain) - mean(withoutPain),
  }
}

function drawnStatus(trial: LeadTrial, plan: TrialArm[], entries: LoggedEntry[], today: string): TrialStatus {
  const key = actionKey(trial.action)
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const todayLogged = byDate.has(today)
  const days: TrialDay[] = plan.map((arm, i) => {
    const date = shiftISO(trial.start, i)
    const entry = byDate.get(date)
    const state: TrialDay['state'] = date > today ? 'future' : !entry ? 'unlogged' : arm
    // Tomorrow shows once today is logged, or at once the day before the trial starts.
    const tomorrow = date === shiftISO(today, 1) && (todayLogged || today < trial.start)
    const rescue = arm === 'without' && !!entry && (entry.positiveActions ?? []).some((a) => actionKey(a) === key)
    return { date, state, arm, revealed: date <= today || tomorrow, rescue }
  })
  const over = today > trial.end
  const pain = (arm: TrialArm) => days.filter((d) => d.state === arm).map((d) => byDate.get(d.date)!.painLevel)
  const withPain = pain('with')
  const withoutPain = pain('without')
  const comparable = over && withPain.length >= DRAWN_MIN_GROUP && withoutPain.length >= DRAWN_MIN_GROUP
  let result: TrialResult | null = null
  if (comparable) {
    // The next day: each day of the trial but the last, paired with the one after it, when both are logged.
    const nextWith: number[] = []
    const nextWithout: number[] = []
    for (let i = 0; i < days.length - 1; i++) {
      const after = byDate.get(days[i + 1].date)
      if (days[i].state === 'unlogged' || days[i].state === 'future' || !after) continue
      ;(days[i].arm === 'with' ? nextWith : nextWithout).push(after.painLevel)
    }
    result = {
      ...compare(withPain, withoutPain),
      sameDirection: null,
      next: nextWith.length >= DRAWN_MIN_GROUP && nextWithout.length >= DRAWN_MIN_GROUP ? compare(nextWith, nextWithout) : null,
      rescues: days.filter((d) => d.rescue).length,
    }
  }
  const elapsed = daysBetween(trial.start, today) + 1
  return {
    drawn: true,
    length: plan.length,
    over,
    day: Math.min(plan.length, Math.max(0, elapsed)),
    days,
    withDays: withPain.length,
    result,
    tooFew: over && !comparable,
  }
}

export function trialStatus(
  trial: LeadTrial,
  entries: LoggedEntry[],
  today: string,
  /** The lead's gap when the trial started, to say if an older week goes the same way */
  leadGap?: number
): TrialStatus {
  if (trial.plan) return drawnStatus(trial, trial.plan, entries, today)
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
    const c = compare(withPain, withoutPain)
    result = { ...c, sameDirection: leadGap === undefined || c.gap === 0 || leadGap === 0 ? null : Math.sign(c.gap) === Math.sign(leadGap) }
  }
  const elapsed = daysBetween(trial.start, today) + 1
  return {
    drawn: false,
    length: TRIAL_DAYS,
    over,
    day: Math.min(TRIAL_DAYS, Math.max(1, elapsed)),
    days,
    withDays: withPain.length,
    result,
    tooFew: over && !comparable,
  }
}

/** Trials closed by the person, kept so the report can say what each showed. */
export const MAX_TRIAL_HISTORY = 30

/** `history` with `trial` added once (the same action from the same day is the same trial), the oldest dropped past a cap. */
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
