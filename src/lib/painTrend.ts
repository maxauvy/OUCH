import { format as formatDate, subDays } from 'date-fns'
import type { DailyEntry } from '../db/types'
import type { Translations } from '../i18n'

export type PainTrend = 'lower' | 'same' | 'higher'

/** Pain of `entry` against the average of the 6 days before it, as shown on
 * the shared card. Null when fewer than 3 of those days were logged, since a
 * "usual" level from one or two days would mislead. Differences under half a
 * point count as the same. */
export function painTrend(entry: DailyEntry, entries: DailyEntry[]): PainTrend | null {
  const end = new Date(entry.date + 'T00:00:00')
  const window = new Set(Array.from({ length: 6 }, (_, i) => formatDate(subDays(end, i + 1), 'yyyy-MM-dd')))
  const previous = entries.filter((e) => window.has(e.date)).map((e) => e.painLevel)
  if (previous.length < 3) return null
  const delta = entry.painLevel - previous.reduce((s, v) => s + v, 0) / previous.length
  if (Math.abs(delta) < 0.5) return 'same'
  return delta < 0 ? 'lower' : 'higher'
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
