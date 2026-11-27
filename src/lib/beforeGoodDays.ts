// What came just before the person's good days, read against chance: the mirror of `beforeFlares.ts`. For each measure the diary keeps, on how many good
// days the eve was more favourable than the person's usual, next to how many chance gives. Not a recipe and not a cause: a longer night can follow a pain
// that was already easing.
//
// A good day is relative to the person, as a flare is: a pain at least 1.5 points and a quarter below the median of the 28 days before (flare days left
// out). A fixed "1 or 2 out of 10" would never come for someone whose usual pain is 5.
//
// Good days often come in a row, and the days of a row are not independent: counting each would make chance look smaller than it is. So a row counts
// once, by its first day, and the reference is every other logged day that is neither a good day nor a flare day.
//
// The eve: the night just before (the sleep is noted on the morning of the good day), and the day before for the rest (stress, fatigue, brain fog, mood).
// The day before's actions are not read here: the leads of Trends already read actions against pain.
//
// The band of chance is the 2nd to the 98th percentile, as in `beforeFlares.ts`, so "nothing stands out" stays the usual answer.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types.ts'
import { CONTEXT_KEYS, type ContextKey } from './flareContext.ts'
import { binomialQuantile } from './pacing.ts'
import { shiftISO } from './dates.ts'
import { mean } from './stats.ts'

/** Rows of good days needed before anything is said. */
export const MIN_GOOD_ROWS = 8
/** Days with an eve and a usual needed to tell how often an eve is more favourable than usual. */
const MIN_CONTROLS = 30
const USUAL_DAYS = 28
const MIN_USUAL = 10
/** A good day: at least this many points below the usual, and at least this share of it. */
export const GOOD_DROP = 1.5
export const GOOD_DROP_SHARE = 0.25
/** "More favourable" is by at least this much on the measure's own scale (hours of sleep, points of 0 to 10). */
const MARGIN = 0.5
const LOW = 0.02
const HIGH = 0.98

/** The sleep is the night before the good day, noted on its morning; the rest is the day before. */
const SAME_DAY: ReadonlySet<ContextKey> = new Set(['sleepHours', 'sleepQuality'])
/** 1 when a higher figure is the more favourable one, -1 when a lower one is. */
const HIGHER_IS_BETTER: Record<ContextKey, 1 | -1> = { sleepHours: 1, sleepQuality: 1, stressLevel: -1, fatigueLevel: -1, brainFog: -1, moodLevel: 1 }

export interface BeforeGoodDaysRow {
  key: ContextKey
  /** Rows of good days whose eve can be compared */
  n: number
  /** Of them, those whose eve was more favourable than usual */
  observed: number
  /** What chance gives for `n` rows: `n` times the rate over the ordinary days */
  expected: number
  low: number
  high: number
  verdict: 'above' | 'within' | 'below'
}

export interface BeforeGoodDays {
  /** Rows of good days counted (the most that any measure could compare) */
  rows: number
  /** One line per measure that can be read, in the order of `CONTEXT_KEYS` */
  lines: BeforeGoodDaysRow[]
  /** The lines above the band, the largest excess first */
  above: BeforeGoodDaysRow[]
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** The highest pain that makes a good day for someone whose usual pain is `usual`. */
export function goodDayCeiling(usual: number): number {
  return usual - Math.max(GOOD_DROP, usual * GOOD_DROP_SHARE)
}

/** The logged days that are good days: a pain well under the median of the 28 days before (flare days left out, at least 10 logged). */
export function goodDaySet(entries: readonly LoggedEntry[], flareDays: ReadonlySet<string>): Set<string> {
  const pain = new Map(entries.map((e) => [e.date, e.painLevel]))
  return new Set(entries.filter((e) => isGoodDay(pain, flareDays, e.date)).map((e) => e.date))
}

/** Whether a logged day is a good day; it depends on that day and the 28 before it only. */
function isGoodDay(pain: ReadonlyMap<string, number>, flareDays: ReadonlySet<string>, date: string): boolean {
  const level = pain.get(date)
  if (level === undefined || flareDays.has(date)) return false
  const usual: number[] = []
  for (let i = 1; i <= USUAL_DAYS; i++) {
    const d = shiftISO(date, -i)
    const p = pain.get(d)
    if (p !== undefined && !flareDays.has(d)) usual.push(p)
  }
  return usual.length >= MIN_USUAL && level <= goodDayCeiling(median(usual))
}

/** The first day of each row of good days (the day before is not a good one). */
export function goodRowStarts(good: ReadonlySet<string>): string[] {
  return [...good].filter((d) => !good.has(shiftISO(d, -1))).sort()
}

/** Whether the eve of `date` was more favourable than the person's usual on `key`; null when there are too few logged days to tell. */
function moreFavourable(byDate: ReadonlyMap<string, LoggedEntry>, flareDays: ReadonlySet<string>, date: string, key: ContextKey): boolean | null {
  const eve = SAME_DAY.has(key) ? date : shiftISO(date, -1)
  const value = byDate.get(eve)?.[key]
  if (typeof value !== 'number') return null
  const usual: number[] = []
  for (let i = 1; i <= USUAL_DAYS; i++) {
    const d = shiftISO(eve, -i)
    const v = byDate.get(d)?.[key]
    if (typeof v === 'number' && !flareDays.has(d)) usual.push(v)
  }
  if (usual.length < MIN_USUAL) return null
  return (value - mean(usual)) * HIGHER_IS_BETTER[key] >= MARGIN
}

export function beforeGoodDays(entries: readonly LoggedEntry[], flareDays: ReadonlySet<string>): BeforeGoodDays | null {
  if (entries.length === 0) return null
  const good = goodDaySet(entries, flareDays)
  const starts = goodRowStarts(good)
  if (starts.length < MIN_GOOD_ROWS) return null
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const reference = entries.map((e) => e.date).filter((d) => !good.has(d) && !flareDays.has(d))

  const lines: BeforeGoodDaysRow[] = []
  for (const key of CONTEXT_KEYS) {
    const cases = starts.map((d) => moreFavourable(byDate, flareDays, d, key)).filter((v): v is boolean => v !== null)
    const controls = reference.map((d) => moreFavourable(byDate, flareDays, d, key)).filter((v): v is boolean => v !== null)
    if (cases.length < MIN_GOOD_ROWS || controls.length < MIN_CONTROLS) continue
    const rate = controls.filter(Boolean).length / controls.length
    const n = cases.length
    const observed = cases.filter(Boolean).length
    const low = binomialQuantile(n, rate, LOW)
    const high = binomialQuantile(n, rate, HIGH)
    lines.push({ key, n, observed, expected: n * rate, low, high, verdict: observed > high ? 'above' : observed < low ? 'below' : 'within' })
  }
  if (lines.length === 0) return null
  return {
    rows: Math.max(...lines.map((r) => r.n)),
    lines,
    above: lines.filter((r) => r.verdict === 'above').sort((a, b) => b.observed - b.expected - (a.observed - a.expected)),
  }
}

/** For the day's page: today is the first good day of a row, and something stands out before such days. The line that stands out most, or null. */
export function goodDayHint(entries: readonly LoggedEntry[], flareDays: ReadonlySet<string>, today: string): BeforeGoodDaysRow | null {
  // Only today and the day before are asked: the whole journal is read only on the rare day that is the first good one of a row.
  const pain = new Map(entries.map((e) => [e.date, e.painLevel]))
  if (!isGoodDay(pain, flareDays, today) || isGoodDay(pain, flareDays, shiftISO(today, -1))) return null
  // Today is left out of the reading: the hint speaks of the days before it.
  const reading = beforeGoodDays(
    entries.filter((e) => e.date < today),
    flareDays
  )
  return reading?.above[0] ?? null
}
