// Flare detection, relative to the person's own usual pain.
//
// A flare is a stretch of days clearly above what is usual for that person,
// not above a fixed score: 7/10 is an ordinary day for some and an
// emergency for others. "Usual" is the median pain of the 28 days before,
// leaving out days already counted in a flare. The rise needed is the larger
// of 2 points and 30 % of that level, the minimal clinically important
// change in the pain-trial literature (Farrar 2001, Dworkin 2008). Those
// figures come from improvement under treatment, so using them for a rise is
// an extrapolation, and there is no consensus definition of a flare to
// check against. Descriptive only: nothing here says why a flare happened.

import type { DailyEntry } from '../db/types'
import { daysBetween, median } from './report.ts'
import { shiftISO } from './medications.ts'

export interface FlareOptions {
  /** Days before a flare used to find the usual level */
  baselineDays: number
  /** Logged days needed in that window; below it nothing is detected */
  minBaselineDays: number
  /** Consecutive days above the threshold for an episode to count */
  minDays: number
  /** Smallest rise over the usual level, in points… */
  minRise: number
  /** …or as a share of it, whichever is larger */
  minRiseShare: number
  /** A day below this is never part of a flare, whatever the usual level */
  floor: number
  /** Back to "usual" means within this many points of it */
  returnMargin: number
  /** Logged days at "usual" in a row that end an episode */
  calmDays: number
  /** Unlogged days in a row after which what happened next is unknown */
  maxGapDays: number
  /** Last day to consider; an episode touching it may still be going on */
  asOf?: string
}

export const DEFAULT_FLARE_OPTIONS: FlareOptions = {
  baselineDays: 28,
  minBaselineDays: 10,
  minDays: 3,
  minRise: 2,
  minRiseShare: 0.3,
  floor: 4,
  returnMargin: 1,
  calmDays: 2,
  maxGapDays: 3,
}

export interface FlareEpisode {
  /** First and last day above the threshold (ISO dates, inclusive) */
  start: string
  end: string
  /** Calendar days from start to end, unlogged days included */
  days: number
  /** Highest pain logged in the episode */
  peak: number
  /** Usual level before the episode */
  baseline: number
  /** Days from the end to the first day back at the usual level; null when
   * that is not known (still going on, or the entries stop) */
  recoveryDays: number | null
  /** Still above the threshold on the last day considered */
  ongoing: boolean
  /** Several days without an entry right after the last high day: the
   * episode may have lasted longer than recorded */
  endUnknown: boolean
}

/** Pain from which a day counts as part of a flare, for a usual level. Above
 * 10 when the usual level is very high: such a person cannot be detected
 * this way, which beats inventing a threshold. */
export function flareThreshold(baseline: number, o: Pick<FlareOptions, 'minRise' | 'minRiseShare'> = DEFAULT_FLARE_OPTIONS): number {
  return baseline + Math.max(o.minRise, o.minRiseShare * baseline)
}

interface Open {
  start: string
  baseline: number
  lastAbove: string
  /** Consecutive high days ending at the last one, then the best so far */
  run: number
  bestRun: number
  peak: number
  /** Logged days at the usual level since the last high day */
  calm: number
  firstCalm: string | null
}

export function detectFlares(entries: DailyEntry[], options: Partial<FlareOptions> = {}): FlareEpisode[] {
  const o = { ...DEFAULT_FLARE_OPTIONS, ...options }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const asOf = o.asOf ?? sorted.at(-1)?.date
  const episodes: FlareEpisode[] = []
  let open: Open | null = null
  let prev: DailyEntry | null = null

  const finish = (ep: Open, how: { endUnknown?: boolean; ongoing?: boolean }) => {
    if (ep.bestRun >= o.minDays) {
      episodes.push({
        start: ep.start,
        end: ep.lastAbove,
        days: daysBetween(ep.start, ep.lastAbove) + 1,
        peak: ep.peak,
        baseline: ep.baseline,
        recoveryDays: ep.firstCalm ? daysBetween(ep.lastAbove, ep.firstCalm) : null,
        ongoing: how.ongoing ?? false,
        endUnknown: how.endUnknown ?? false,
      })
    }
  }

  /** Usual level before `date`, leaving out days already in a flare. */
  const baselineBefore = (date: string): number | null => {
    const from = shiftISO(date, -o.baselineDays)
    const values = sorted
      .filter((e) => e.date >= from && e.date < date && !episodes.some((ep) => e.date >= ep.start && e.date <= ep.end))
      .map((e) => e.painLevel)
    return values.length >= o.minBaselineDays ? median(values) : null
  }

  for (const e of sorted) {
    if (asOf && e.date > asOf) break

    if (open && prev && daysBetween(prev.date, e.date) > o.maxGapDays) {
      // Too long without an entry to say how it went on.
      finish(open, { endUnknown: open.calm === 0 })
      open = null
    }

    if (open) {
      const high = e.painLevel >= flareThreshold(open.baseline, o)
      if (high) {
        // A missing day between two high days does not break the run.
        open.run = open.calm === 0 && daysBetween(open.lastAbove, e.date) <= 2 ? open.run + 1 : 1
        open.bestRun = Math.max(open.bestRun, open.run)
        open.lastAbove = e.date
        open.peak = Math.max(open.peak, e.painLevel)
        open.calm = 0
        open.firstCalm = null
      } else if (e.painLevel <= open.baseline + o.returnMargin) {
        open.calm++
        open.firstCalm ??= e.date
        if (open.calm >= o.calmDays) {
          finish(open, {})
          open = null
        }
      } else {
        open.calm = 0
        open.firstCalm = null
      }
    } else {
      const baseline = baselineBefore(e.date)
      if (baseline !== null && e.painLevel >= o.floor && e.painLevel >= flareThreshold(baseline, o)) {
        open = { start: e.date, baseline, lastAbove: e.date, run: 1, bestRun: 1, peak: e.painLevel, calm: 0, firstCalm: null }
      }
    }
    prev = e
  }

  if (open) {
    const ongoing = !!asOf && open.calm === 0 && daysBetween(open.lastAbove, asOf) <= 1
    finish(open, { ongoing })
  }
  return episodes
}

/** Whether the entries can show a flare at all: some day must have enough
 * logged days before it to tell what is usual. Without this, "no flare" and
 * "too few entries to say" would read the same. */
export function canDetectFlares(entries: DailyEntry[], options: Partial<FlareOptions> = {}): boolean {
  const o = { ...DEFAULT_FLARE_OPTIONS, ...options }
  return entries.some((e) => {
    const from = shiftISO(e.date, -o.baselineDays)
    return entries.filter((x) => x.date >= from && x.date < e.date).length >= o.minBaselineDays
  })
}

/** The episodes that touch [from, to] (inclusive), even if they start before. */
export function flaresOverlapping(episodes: FlareEpisode[], from: string, to: string): FlareEpisode[] {
  return episodes.filter((e) => e.end >= from && e.start <= to)
}

/** Every calendar day inside a flare, unlogged ones included, as ISO dates. */
export function flareDaySet(episodes: FlareEpisode[]): Set<string> {
  const days = new Set<string>()
  for (const e of episodes) for (let d = e.start; d <= e.end; d = shiftISO(d, 1)) days.add(d)
  return days
}

/** Calendar days of [from, to] (inclusive) that fall inside a flare. */
export function flareDayCount(episodes: FlareEpisode[], from: string, to: string): number {
  return episodes.reduce((sum, ep) => {
    const start = ep.start > from ? ep.start : from
    const end = ep.end < to ? ep.end : to
    return end >= start ? sum + daysBetween(start, end) + 1 : sum
  }, 0)
}
