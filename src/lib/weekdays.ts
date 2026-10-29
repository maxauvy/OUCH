// How pain differs by day of the week, and how much of it chance alone could
// produce. A "best weekday" read off a few days is mostly noise: with a week
// or two of entries each weekday has one or two days behind it. So nothing is
// said until every weekday has MIN_PER_WEEKDAY days, and a day only stands out
// when it leaves a band that chance can fill.
//
// The band: the standard error of a weekday's mean (the spread of the daily
// pain over the square root of the days behind it), taken for the weekday
// with the fewest days and widened to 2.69 standard errors, the two-sided 5 %
// point once seven weekdays are looked at together (Bonferroni). Days are not
// independent (a flare lasts several days), so the band is indicative, and the
// report says so.

import type { LoggedEntry } from '../db/types'
import { mean, sd } from './stats.ts'

export const MIN_PER_WEEKDAY = 4
export const BONFERRONI_Z_7 = 2.69

export interface WeekdayStat {
  /** 0 = Monday … 6 = Sunday */
  index: number
  /** 0 = Sunday … 6 = Saturday, as `Date#getDay()` and the weekday names use it */
  jsDay: number
  /** Days with a pain level */
  n: number
  mean: number
  /** `mean` minus the mean of every day */
  gap: number
}

export interface WeekdayProfile {
  /** Monday first */
  days: WeekdayStat[]
  /** Mean of every day with a pain level */
  overall: number
  /** Days behind it */
  total: number
  /** Fewest days behind any weekday */
  minDays: number
  /** The gap chance alone can produce (see above), in points */
  band: number
  best: WeekdayStat | null
  worst: WeekdayStat | null
  /** Whether the easiest / hardest weekday leaves the band */
  bestStandsOut: boolean
  worstStandsOut: boolean
}

/** Monday-first index of a calendar date. */
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7
}

/** Null until each weekday has MIN_PER_WEEKDAY days with a pain level. */
export function weekdayProfile(entries: LoggedEntry[]): WeekdayProfile | null {
  const groups: number[][] = Array.from({ length: 7 }, () => [])
  for (const e of entries) groups[weekdayIndex(e.date)]!.push(e.painLevel)
  if (groups.some((g) => g.length < MIN_PER_WEEKDAY)) return null

  const all = groups.flat()
  const overall = mean(all)
  const minDays = Math.min(...groups.map((g) => g.length))
  const band = (BONFERRONI_Z_7 * sd(all)) / Math.sqrt(minDays)
  const days: WeekdayStat[] = groups.map((g, index) => ({
    index,
    jsDay: (index + 1) % 7,
    n: g.length,
    mean: mean(g),
    gap: mean(g) - overall,
  }))

  const lowest = days.reduce((a, b) => (b.mean < a.mean ? b : a))
  const highest = days.reduce((a, b) => (b.mean > a.mean ? b : a))
  const spread = highest.mean > lowest.mean
  return {
    days,
    overall,
    total: all.length,
    minDays,
    band,
    best: spread ? lowest : null,
    worst: spread ? highest : null,
    bestStandsOut: spread && -lowest.gap > band,
    worstStandsOut: spread && highest.gap > band,
  }
}
