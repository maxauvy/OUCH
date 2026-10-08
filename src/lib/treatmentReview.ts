// What changed in the diary around a change of background treatment, and
// nothing more. Four weeks before, a week to settle in that is not counted,
// four weeks after; the same measures on both sides, the logged days stated,
// and no verdict. Pain drifts on its own and a change is often made during a
// bad stretch, so a difference here is never an effect: when the person's
// own history is long enough, it is set beside how much two months in a row
// usually differ for them (the same lesson as the flares: a figure without
// its chance rate reads as a finding).

import type { DailyEntry, Medication } from '../db/types'
import { shiftISO } from './medications.ts'
import { daysBetween, mean, quantile } from './report.ts'
import { treatmentEvents, type TreatmentEvent } from './treatmentEvents.ts'

export interface ReviewOptions {
  /** Days compared before the change, and after the settling-in days */
  windowDays: number
  /** Days after the change that are not counted: a background treatment
   * rarely acts on day one, and these days would blur both sides */
  settleDays: number
  /** Logged days needed on each side for any figure */
  minDays: number
  /** Consecutive pairs of windows in the person's history needed to say how
   * much two of them usually differ */
  minPairs: number
  /** Share of those differences the "usual gap" covers */
  usualShare: number
}

export const DEFAULT_REVIEW_OPTIONS: ReviewOptions = { windowDays: 28, settleDays: 7, minDays: 14, minPairs: 6, usualShare: 0.8 }

/** The measures compared, in the order they are shown. */
export const REVIEW_MEASURES = ['pain', 'flareDays', 'rescue', 'sleepHours'] as const
export type ReviewMeasure = (typeof REVIEW_MEASURES)[number]

export interface Comparison {
  before: number | null
  after: number | null
  /** How much two windows in a row differ in this person's history, usually
   * (see `usualShare`); null without enough history */
  usualGap: number | null
}

export type ReviewStatus =
  /** Both windows are over and have enough logged days */
  | 'ready'
  /** The window after is still running */
  | 'inProgress'
  /** Too few logged days on a side for a comparison */
  | 'tooFewDays'

export interface SideEffectCount {
  effect: string
  days: number
}

export interface TreatmentReview {
  event: TreatmentEvent
  /** First day without the previous posology: the start, the new dose, or
   * the day after the last one taken */
  date: string
  status: ReviewStatus
  /** Logged days in each window */
  nBefore: number
  nAfter: number
  /** Days of the window after that have passed, up to `windowDays` */
  daysAfter: number
  /** Figures are given only when both sides have enough logged days; those
   * that need a full window (flare days, the usual gap) also wait for it */
  comparable: boolean
  measures: Record<ReviewMeasure, Comparison>
  /** Side effects reported with this treatment, most frequent first */
  sideEffects: { before: SideEffectCount[]; after: SideEffectCount[] }
  /** Other background treatments that started, changed or stopped between
   * the first day before and the last day after */
  alsoChanged: TreatmentEvent[]
  /** The change was made during a flare, so an improvement may follow on its own */
  duringFlare: boolean
}

/** First day without the previous posology. */
export function changeDate(event: TreatmentEvent): string {
  return event.kind === 'stopped' ? shiftISO(event.date, 1) : event.date
}

export interface ReviewWindows {
  beforeFrom: string
  beforeTo: string
  afterFrom: string
  afterTo: string
}

export function reviewWindows(date: string, o: ReviewOptions = DEFAULT_REVIEW_OPTIONS): ReviewWindows {
  return {
    beforeFrom: shiftISO(date, -o.windowDays),
    beforeTo: shiftISO(date, -1),
    afterFrom: shiftISO(date, o.settleDays),
    afterTo: shiftISO(date, o.settleDays + o.windowDays - 1),
  }
}

type Reading = (entries: DailyEntry[], from: string, to: string) => number | null

const within = (entries: DailyEntry[], from: string, to: string) => entries.filter((e) => e.date >= from && e.date <= to)

function meanReading(get: (e: DailyEntry) => number | undefined, min: number): Reading {
  return (entries, from, to) => {
    const values = within(entries, from, to).map(get).filter((v): v is number => typeof v === 'number')
    return values.length >= min ? mean(values) : null
  }
}

/** Intakes per logged day of what is taken as needed (or not described). An
 * intake without a count is one. */
function rescuePerDay(medications: Medication[], min: number): Reading {
  const rescue = new Set(medications.filter((m) => m.regimen !== 'scheduled').map((m) => m.id))
  return (entries, from, to) => {
    const days = within(entries, from, to)
    if (days.length < min) return null
    const doses = days.reduce(
      (sum, e) => sum + (e.intakes ?? []).filter((i) => rescue.has(i.medicationId)).reduce((s, i) => s + (i.doses ?? 1), 0),
      0
    )
    return doses / days.length
  }
}

function sideEffects(entries: DailyEntry[], medId: string, from: string, to: string): SideEffectCount[] {
  const days = new Map<string, Set<string>>()
  for (const e of within(entries, from, to)) {
    for (const i of e.intakes ?? []) {
      if (i.medicationId !== medId) continue
      for (const effect of i.sideEffects ?? []) days.set(effect, (days.get(effect) ?? new Set()).add(e.date))
    }
  }
  return [...days]
    .map(([effect, set]) => ({ effect, days: set.size }))
    .sort((a, b) => b.days - a.days || a.effect.localeCompare(b.effect))
}

/** How much two windows in a row usually differ in the person's own diary:
 * the `usualShare` quantile of the absolute differences between consecutive
 * windows of `windowDays`, tiled from the first logged day. A window needs
 * `minDays` logged days; one that overlaps `skip` (the review's own span) is
 * left out so the change being looked at does not widen its own yardstick. */
function usualGap(
  entries: DailyEntry[],
  read: Reading,
  skip: { from: string; to: string },
  asOf: string,
  o: ReviewOptions
): number | null {
  const first = entries[0]?.date
  if (!first) return null
  const tiles = Math.floor((daysBetween(first, asOf) + 1) / o.windowDays)
  const values: (number | null)[] = Array.from({ length: tiles }, (_, i) => {
    const from = shiftISO(first, i * o.windowDays)
    const to = shiftISO(from, o.windowDays - 1)
    if (to >= skip.from && from <= skip.to) return null
    return read(entries, from, to)
  })
  const gaps: number[] = []
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1]
    const b = values[i]
    if (a !== null && b !== null) gaps.push(Math.abs(b - a))
  }
  return gaps.length >= o.minPairs ? quantile(gaps, o.usualShare) : null
}

/**
 * One review per start, dose change or stop of a scheduled treatment, oldest
 * first. `flareDays` are the days inside a flare (`flareDaySet`), or null
 * when flares cannot be told yet. As-needed treatments are not reviewed:
 * what they do is a measure here, not a subject.
 */
export function treatmentReviews(
  entries: DailyEntry[],
  medications: Medication[],
  flareDays: Set<string> | null,
  asOf: string,
  options: Partial<ReviewOptions> = {}
): TreatmentReview[] {
  const o = { ...DEFAULT_REVIEW_OPTIONS, ...options }
  const sorted = entries.filter((e) => e.date <= asOf).sort((a, b) => a.date.localeCompare(b.date))
  const events = treatmentEvents(medications)
  const scheduled = events.filter((e) => e.med.regimen === 'scheduled')

  const readers: Record<ReviewMeasure, Reading> = {
    pain: meanReading((e) => e.painLevel, o.minDays),
    flareDays: (all, from, to) => {
      // Only a full window says "this many days out of that many".
      if (!flareDays || within(all, from, to).length < o.minDays) return null
      let n = 0
      for (let d = from; d <= to; d = shiftISO(d, 1)) if (flareDays.has(d)) n++
      return n
    },
    rescue: rescuePerDay(medications, o.minDays),
    sleepHours: meanReading((e) => e.sleepHours, o.minDays),
  }

  return scheduled.map((event) => {
    const date = changeDate(event)
    const w = reviewWindows(date, o)
    const before = within(sorted, w.beforeFrom, w.beforeTo)
    const after = within(sorted, w.afterFrom, w.afterTo)
    const over = w.afterTo <= asOf
    const comparable = before.length >= o.minDays && after.length >= o.minDays
    const status: ReviewStatus = !comparable && (over || before.length < o.minDays) ? 'tooFewDays' : over ? 'ready' : 'inProgress'
    const skip = { from: w.beforeFrom, to: w.afterTo }

    const measures = Object.fromEntries(
      REVIEW_MEASURES.map((key) => {
        const read = readers[key]
        const full = key !== 'flareDays' || over
        const figure = comparable && status !== 'tooFewDays'
        return [
          key,
          {
            before: figure ? read(sorted, w.beforeFrom, w.beforeTo) : null,
            after: figure && full ? read(sorted, w.afterFrom, over ? w.afterTo : asOf) : null,
            usualGap: status === 'ready' ? usualGap(sorted, read, skip, asOf, o) : null,
          },
        ]
      })
    ) as Record<ReviewMeasure, Comparison>

    return {
      event,
      date,
      status,
      nBefore: before.length,
      nAfter: after.length,
      daysAfter: Math.max(0, Math.min(o.windowDays, daysBetween(w.afterFrom, asOf) + 1)),
      comparable: comparable && status !== 'tooFewDays',
      measures,
      sideEffects: {
        before: sideEffects(sorted, event.med.id, w.beforeFrom, w.beforeTo),
        after: sideEffects(sorted, event.med.id, w.afterFrom, over ? w.afterTo : asOf),
      },
      alsoChanged: scheduled.filter((other) => {
        if (other === event) return false
        const day = changeDate(other)
        return day >= w.beforeFrom && day <= w.afterTo
      }),
      duringFlare: !!flareDays && (flareDays.has(date) || flareDays.has(shiftISO(date, -1))),
    }
  })
}
