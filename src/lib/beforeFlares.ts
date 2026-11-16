// What the three days before the person's flares looked like, all together and read against chance. Not a prediction and not a cause: for each measure the
// diary keeps (sleep, stress, fatigue, brain fog, mood), on how many flares the three days before were less favourable than the person's usual, next to how
// many chance gives for them. The rule written with `flareContext.ts` holds: no flag without a chance rate, so nothing here stands out unless it leaves a band
// that is wide on purpose.
//
// Six measures are read at once, and one of six outside a 10 %-to-90 % band is what chance does about every other time. The band is the 2nd to the 98th
// percentile instead, so that something leaves it by chance for about one person in ten, and "nothing stands out" is the usual answer.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types.ts'
import { CONTEXT_KEYS, type ContextKey } from './flareContext.ts'
import { flareDaySet, type FlareEpisode } from './flares.ts'
import { binomialQuantile } from './pacing.ts'
import { shiftISO } from './dates.ts'
import { mean } from './stats.ts'

/** Flares needed before anything is said. */
export const MIN_FLARES = 4
/** Days looked at before a flare, and days before those that make the person's usual (flare days left out). */
const WINDOW_DAYS = 3
const USUAL_DAYS = 28
const MIN_WINDOW = 2
const MIN_USUAL = 10
/** Days with a window and a usual needed to tell how often a window is less favourable than usual. */
const MIN_CONTROLS = 30
/** "Less favourable" is by at least this much on the measure's own scale (hours of sleep, points of 0 to 10). */
const MARGIN = 0.5
/** The band of chance: from the 2nd to the 98th percentile (see the top of this file). */
const LOW = 0.02
const HIGH = 0.98

/** 1 when a higher figure is the less favourable one, -1 when a lower one is. */
const HIGHER_IS_WORSE: Record<ContextKey, 1 | -1> = { sleepHours: -1, sleepQuality: -1, stressLevel: 1, fatigueLevel: 1, brainFog: 1, moodLevel: -1 }

export interface BeforeFlaresRow {
  key: ContextKey
  /** Flares with enough logged days before them to be compared */
  n: number
  /** Of them, those whose three days before were less favourable than usual */
  observed: number
  /** What chance gives for `n` flares: `n` times the rate over the days that precede no flare */
  expected: number
  low: number
  high: number
  verdict: 'above' | 'within' | 'below'
}

export interface BeforeFlares {
  /** Flares counted (the most that any measure could compare) */
  flares: number
  /** One row per measure that can be read, in the order of `CONTEXT_KEYS` */
  rows: BeforeFlaresRow[]
  /** The rows above the band, the largest excess first */
  above: BeforeFlaresRow[]
}

/** Whether the three days before `date` were less favourable than the person's usual on `key`; null when there are too few logged days to tell. */
function lessFavourable(byDate: ReadonlyMap<string, LoggedEntry>, flareDays: ReadonlySet<string>, date: string, key: ContextKey): boolean | null {
  const values = (from: number, count: number, skipFlare: boolean): number[] =>
    Array.from({ length: count }, (_, i) => shiftISO(date, from + i))
      .filter((d) => !skipFlare || !flareDays.has(d))
      .map((d) => byDate.get(d)?.[key])
      .filter((v): v is number => typeof v === 'number')
  const window = values(-WINDOW_DAYS, WINDOW_DAYS, false)
  const usual = values(-WINDOW_DAYS - USUAL_DAYS, USUAL_DAYS, true)
  if (window.length < MIN_WINDOW || usual.length < MIN_USUAL) return null
  return (mean(window) - mean(usual)) * HIGHER_IS_WORSE[key] >= MARGIN
}

export function beforeFlares(entries: readonly LoggedEntry[], episodes: readonly FlareEpisode[]): BeforeFlares | null {
  if (episodes.length < MIN_FLARES || entries.length === 0) return null
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const flareDays = flareDaySet([...episodes])
  const dates = entries.map((e) => e.date).sort()
  const first = dates[0]!
  const last = dates[dates.length - 1]!

  // The days a flare could have started on, as a reference: not inside a flare, with no flare day in the three days just before, and not the one or two days
  // before a flare begins (their three days overlap the ones that are being compared).
  const justBefore = new Set(episodes.flatMap((e) => [shiftISO(e.start, -1), shiftISO(e.start, -2)]))
  const reference: string[] = []
  for (let d = shiftISO(first, WINDOW_DAYS + 1); d <= last; d = shiftISO(d, 1)) {
    if (flareDays.has(d) || justBefore.has(d)) continue
    if (Array.from({ length: WINDOW_DAYS }, (_, i) => shiftISO(d, -(i + 1))).some((x) => flareDays.has(x))) continue
    reference.push(d)
  }

  const rows: BeforeFlaresRow[] = []
  for (const key of CONTEXT_KEYS) {
    const cases = episodes.map((e) => lessFavourable(byDate, flareDays, e.start, key)).filter((v): v is boolean => v !== null)
    const controls = reference.map((d) => lessFavourable(byDate, flareDays, d, key)).filter((v): v is boolean => v !== null)
    if (cases.length < MIN_FLARES || controls.length < MIN_CONTROLS) continue
    const rate = controls.filter(Boolean).length / controls.length
    const n = cases.length
    const observed = cases.filter(Boolean).length
    const low = binomialQuantile(n, rate, LOW)
    const high = binomialQuantile(n, rate, HIGH)
    rows.push({ key, n, observed, expected: n * rate, low, high, verdict: observed > high ? 'above' : observed < low ? 'below' : 'within' })
  }
  if (rows.length === 0) return null
  return {
    flares: Math.max(...rows.map((r) => r.n)),
    rows,
    above: rows.filter((r) => r.verdict === 'above').sort((a, b) => b.observed - b.expected - (a.observed - a.expected)),
  }
}
