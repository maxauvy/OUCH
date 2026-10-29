import { shiftISO } from './dates.ts'
import { mean } from './stats.ts'
import type { LoggedEntry } from '../db/types'
import type { Translations } from '../i18n'

export type PainTrend = 'lower' | 'same' | 'higher'

/** Days before the day that make "the days before". */
const TREND_WINDOW_DAYS = 6
/** Logged days needed among them: a "usual" level from one or two days would mislead. */
const TREND_MIN_DAYS = 3
/** A difference under this, in points, counts as the same. */
const TREND_SAME_BAND = 0.5

/** A day's pain against the average of the 6 days before it: the one reading
 * behind the line under the pain on the day's page and the shared card. Null
 * when fewer than 3 of those days were logged. `entries` may hold days without
 * a pain level; they are not counted. */
export function painVsRecent(
  date: string,
  painLevel: number,
  entries: readonly { date: string; painLevel?: number }[]
): { delta: number; trend: PainTrend; n: number } | null {
  const window = new Set(Array.from({ length: TREND_WINDOW_DAYS }, (_, i) => shiftISO(date, -(i + 1))))
  const previous = entries.flatMap((e) => (window.has(e.date) && typeof e.painLevel === 'number' ? [e.painLevel] : []))
  if (previous.length < TREND_MIN_DAYS) return null
  const delta = painLevel - mean(previous)
  const trend: PainTrend = Math.abs(delta) < TREND_SAME_BAND ? 'same' : delta < 0 ? 'lower' : 'higher'
  return { delta, trend, n: previous.length }
}

export function painTrend(entry: LoggedEntry, entries: LoggedEntry[]): PainTrend | null {
  return painVsRecent(entry.date, entry.painLevel, entries)?.trend ?? null
}

/** Index into the pain words: none (0), mild (1–3), moderate (4–6),
 * severe (7–8), very severe (9–10), the usual bands of 0–10 pain scales. */
export function painWordIndex(value: number): 0 | 1 | 2 | 3 | 4 {
  if (value === 0) return 0
  if (value <= 3) return 1
  if (value <= 6) return 2
  if (value <= 8) return 3
  return 4
}

export function painTrendText(t: Translations, trend: PainTrend): string {
  return trend === 'lower' ? t.weatherCard.trendLower : trend === 'same' ? t.weatherCard.trendSame : t.weatherCard.trendHigher
}
