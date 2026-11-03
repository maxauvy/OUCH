// Two stretches of the diary set side by side: the same figures on each, the
// logged days stated, and how much two stretches of that length usually differ
// for this person, so that a gap is read against it (the lesson of the flares
// and of the treatment review: a difference with no chance rate reads as a
// finding). Descriptive only: nothing here says why the two differ.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry, MorningStiffness } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { mean, quantile } from './stats.ts'
import { summarizeMorningStiffness } from './stiffnessSummary.ts'

/** Logged days a stretch needs before its figures are quoted. */
export const MIN_LOGGED = 7
/** Pain from which a day counts as severe, as in the report. */
export const SEVERE_FROM = 7
/** Windows of this length, one after the other from the first logged day, give the usual gap. */
const MIN_WINDOW = 14
const MAX_WINDOW = 60
/** Pairs of windows in a row needed to say what is usual, and the share of them the gap covers. */
const MIN_PAIRS = 6
const USUAL_SHARE = 0.8

export interface Span {
  from: string
  to: string
}

export interface Figures {
  /** Calendar days of the stretch. */
  days: number
  /** Days with a pain level. */
  logged: number
  /** Mean pain, null with no logged day. */
  pain: number | null
  /** Days at 7/10 or more. */
  severe: number
  /** Days inside a detected flare; null when flares cannot be told. */
  flareDays: number | null
  /** The most frequent morning stiffness band, when the person follows it and one band leads. */
  stiffness: MorningStiffness | null
}

export function figures(entries: readonly LoggedEntry[], span: Span, flareDays: ReadonlySet<string> | null): Figures {
  const inside = entries.filter((e) => e.date >= span.from && e.date <= span.to)
  return {
    days: daysBetween(span.from, span.to) + 1,
    logged: inside.length,
    pain: inside.length ? mean(inside.map((e) => e.painLevel)) : null,
    severe: inside.filter((e) => e.painLevel >= SEVERE_FROM).length,
    flareDays: flareDays ? inside.filter((e) => flareDays.has(e.date)).length : null,
    stiffness: summarizeMorningStiffness(inside).commonest ?? null,
  }
}

/** The length of the windows that give the usual gap: that of the shorter stretch, within bounds. */
export function windowFor(a: Span, b: Span): number {
  const days = Math.min(daysBetween(a.from, a.to), daysBetween(b.from, b.to)) + 1
  return Math.min(Math.max(days, MIN_WINDOW), MAX_WINDOW)
}

/** How much the mean pain of two windows in a row usually differs in this diary: the `USUAL_SHARE` quantile of the gaps between consecutive windows, tiled from the first logged day up to `asOf`. A window needs half its days logged (and at least `MIN_LOGGED`). Null without enough pairs. */
export function usualPainGap(entries: readonly LoggedEntry[], windowDays: number, asOf: string): number | null {
  const first = entries[0]?.date
  if (!first) return null
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const start = sorted[0]!.date
  const tiles = Math.floor((daysBetween(start, asOf) + 1) / windowDays)
  const need = Math.max(MIN_LOGGED, Math.ceil(windowDays / 2))
  const values: (number | null)[] = Array.from({ length: tiles }, (_, i) => {
    const from = shiftISO(start, i * windowDays)
    const to = shiftISO(from, windowDays - 1)
    const inside = sorted.filter((e) => e.date >= from && e.date <= to)
    return inside.length >= need ? mean(inside.map((e) => e.painLevel)) : null
  })
  const gaps: number[] = []
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1]
    const b = values[i]
    if (a !== null && b !== null) gaps.push(Math.abs(b - a))
  }
  return gaps.length >= MIN_PAIRS ? quantile(gaps, USUAL_SHARE) : null
}

export interface Comparison {
  a: Figures
  b: Figures
  /** Both stretches have enough logged days. */
  enough: boolean
  /** Mean pain of b minus that of a; null when either has none. */
  diff: number | null
  /** The usual gap between two windows of `windowDays`; null without enough history. */
  gap: number | null
  windowDays: number
  /** Whether the difference stays within the usual gap; null when either is missing. */
  within: boolean | null
}

export function comparePeriods(entries: readonly LoggedEntry[], a: Span, b: Span, flareDays: ReadonlySet<string> | null, asOf: string): Comparison {
  const fa = figures(entries, a, flareDays)
  const fb = figures(entries, b, flareDays)
  const enough = fa.logged >= MIN_LOGGED && fb.logged >= MIN_LOGGED
  const diff = fa.pain !== null && fb.pain !== null ? fb.pain - fa.pain : null
  const windowDays = windowFor(a, b)
  const gap = enough ? usualPainGap(entries, windowDays, asOf) : null
  return { a: fa, b: fb, enough, diff, gap, windowDays, within: enough && diff !== null && gap !== null ? Math.abs(diff) <= gap : null }
}

/** Whether two stretches are valid to compare: each runs forward, none starts in the future, and they do not overlap. */
export function validSpans(a: Span, b: Span, today: string): boolean {
  return a.from <= a.to && b.from <= b.to && a.to < b.from && b.to <= today
}

export type PresetKind = 'days30' | 'sinceVisit'

/** The two stretches of a preset: the last 30 days against the 30 before, or the time since the last appointment against as long before it. */
export function presetSpans(kind: PresetKind, today: string, lastVisit?: string): { a: Span; b: Span } | null {
  if (kind === 'days30') return { a: { from: shiftISO(today, -59), to: shiftISO(today, -30) }, b: { from: shiftISO(today, -29), to: today } }
  if (!lastVisit || lastVisit >= today) return null
  const length = daysBetween(lastVisit, today) + 1
  return { a: { from: shiftISO(lastVisit, -length), to: shiftISO(lastVisit, -1) }, b: { from: lastVisit, to: today } }
}
