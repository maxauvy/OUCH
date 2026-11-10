// How the days after the most active ones went, read against chance. Two
// things, both descriptive: a reading over the whole diary (are the days that
// follow the person's busiest days harder than usual more often than days in
// general?) and the day after one big day. Nothing here says that activity
// causes pain: the activity and the pain of a day are noted together, and a
// day is "harder" only against the person's own usual level.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { median, quantile } from './stats.ts'

/** Logged days with the activity noted before the reading appears. */
export const MIN_ACTIVITY_DAYS = 30
/** Active days (with a next day to look at) needed to say anything. */
export const MIN_ACTIVE_DAYS = 5
/** The busiest share of the days is the "active" ones. */
const ACTIVE_SHARE = 0.2
/** The usual level of a day is the median pain of the days before it. */
const BASELINE_DAYS = 28
const MIN_BASELINE_DAYS = 10
/** Days with a usual level needed to tell how often a day is harder than it. */
const MIN_RATE_DAYS = 20
/** The band of chance: from the 10th to the 90th percentile. */
const LOW = 0.1
const HIGH = 0.9

export interface PacingReading {
  /** Active days that have a next day to look at. */
  k: number
  /** Of them, those whose next day was harder than usual. */
  observed: number
  /** What chance gives for `k` days: `k` times the rate for all days. */
  expected: number
  /** The band chance gives (10th to 90th percentile). */
  low: number
  high: number
  verdict: 'above' | 'within' | 'below'
}

/** The usual pain before a day: the median of the logged days of the 28 before, when there are enough. */
export function usualBefore(byDate: ReadonlyMap<string, number>, date: string): number | null {
  const values: number[] = []
  for (let i = 1; i <= BASELINE_DAYS; i++) {
    const v = byDate.get(shiftISO(date, -i))
    if (v !== undefined) values.push(v)
  }
  return values.length >= MIN_BASELINE_DAYS ? median(values) : null
}

/** Smallest j whose cumulative probability under Binomial(k, q) reaches `p`. */
export function binomialQuantile(k: number, q: number, p: number): number {
  if (q <= 0) return 0
  if (q >= 1) return k
  let pmf = (1 - q) ** k
  let cdf = pmf
  for (let j = 0; j < k; j++) {
    if (cdf >= p - 1e-12) return j
    pmf *= ((k - j) / (j + 1)) * (q / (1 - q))
    cdf += pmf
  }
  return k
}

/** The activity from which a day counts as a big one: the busiest fifth of the person's days. */
function activeFrom(entries: readonly LoggedEntry[]): number | null {
  const levels = entries.flatMap((e) => (e.activityLevel === undefined ? [] : [e.activityLevel]))
  return levels.length >= MIN_ACTIVITY_DAYS ? quantile(levels, 1 - ACTIVE_SHARE) : null
}

export function pacingReading(entries: readonly LoggedEntry[]): PacingReading | null {
  const threshold = activeFrom(entries)
  if (threshold === null) return null
  const byDate = new Map(entries.map((e) => [e.date, e.painLevel]))
  const harder = (date: string): boolean | null => {
    const pain = byDate.get(date)
    const usual = pain === undefined ? null : usualBefore(byDate, date)
    return pain === undefined || usual === null ? null : pain > usual
  }
  let days = 0
  let harderDays = 0
  for (const e of entries) {
    const h = harder(e.date)
    if (h === null) continue
    days++
    if (h) harderDays++
  }
  if (days < MIN_RATE_DAYS) return null
  const rate = harderDays / days

  let k = 0
  let observed = 0
  for (const e of entries) {
    if (e.activityLevel === undefined || e.activityLevel < threshold) continue
    const h = harder(shiftISO(e.date, 1))
    if (h === null) continue
    k++
    if (h) observed++
  }
  if (k < MIN_ACTIVE_DAYS) return null
  const low = binomialQuantile(k, rate, LOW)
  const high = binomialQuantile(k, rate, HIGH)
  return { k, observed, expected: k * rate, low, high, verdict: observed > high ? 'above' : observed < low ? 'below' : 'within' }
}

/** Yesterday was a big day: its activity reaches the person's busiest fifth of the last 90 days, and a level that is really high. Quiet otherwise. */
export function bigDayBefore(entries: readonly LoggedEntry[], today: string): boolean {
  const recent = entries.filter((e) => daysBetween(e.date, today) >= 1 && daysBetween(e.date, today) <= 90)
  const threshold = activeFrom(recent)
  if (threshold === null) return false
  const yesterday = entries.find((e) => e.date === shiftISO(today, -1))
  return yesterday?.activityLevel !== undefined && yesterday.activityLevel >= Math.max(threshold, 6)
}
