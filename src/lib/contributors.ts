// "Qu'est-ce qui a pu jouer ?": on a day that is out of the ordinary, a few soft labels the person can touch (sleep, stress, effort, weather, periods, infection, treatment),
// kept on the day. It is what they feel played a part, never a cause: nothing here computes anything from them, and the report only says on how many days each was noted.
// The question is asked only when the day stands out from the person's own usual, so that it is not asked every evening.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry, FlareFactor } from '../db/types.ts'
import { cleanFactors } from './markedFlares.ts'
import { shiftISO } from './dates.ts'
import { median } from './stats.ts'

/** The usual of a day is the median of the days before it, when there are enough. */
const BASELINE_DAYS = 28
const MIN_BASELINE_DAYS = 10
/** Pain this many points above the usual, or a night this many hours shorter than the usual, makes a day worth a question. */
export const PAIN_RISE = 2
export const SLEEP_DROP = 1.5

type Day = Pick<DailyEntry, 'date' | 'painLevel' | 'sleepHours' | 'contributors'>

function usualOf(entries: readonly Day[], date: string, key: 'painLevel' | 'sleepHours'): number | null {
  const byDate = new Map(entries.map((e) => [e.date, e[key]]))
  const values: number[] = []
  for (let i = 1; i <= BASELINE_DAYS; i++) {
    const v = byDate.get(shiftISO(date, -i))
    if (typeof v === 'number') values.push(v)
  }
  return values.length >= MIN_BASELINE_DAYS ? median(values) : null
}

export interface UnusualDay {
  pain: boolean
  sleep: boolean
}

/** Whether the day, as it is now, stands out from the person's usual: its pain, or its night. Nothing is said without a usual to compare with. */
export function unusualDay(day: Pick<Day, 'painLevel' | 'sleepHours'>, entries: readonly Day[], date: string): UnusualDay {
  const pain = typeof day.painLevel === 'number' ? usualOf(entries, date, 'painLevel') : null
  const sleep = typeof day.sleepHours === 'number' ? usualOf(entries, date, 'sleepHours') : null
  return {
    pain: pain !== null && day.painLevel! >= pain + PAIN_RISE,
    sleep: sleep !== null && day.sleepHours! <= sleep - SLEEP_DROP,
  }
}

export const isUnusual = (u: UnusualDay): boolean => u.pain || u.sleep

/** Touching a label: it goes in, or it goes out; the list stays in the app's order. */
export function toggleContributor(list: readonly FlareFactor[] | undefined, factor: FlareFactor): FlareFactor[] {
  const has = list?.includes(factor)
  return cleanFactors(has ? list!.filter((f) => f !== factor) : [...(list ?? []), factor])
}

/** On how many days of a period each label was noted, the most often first (ties in the app's order); none for a label never noted. */
export function contributorDays(entries: readonly Pick<DailyEntry, 'date' | 'contributors'>[], from: string, to: string): { factor: FlareFactor; days: number }[] {
  const counts = new Map<FlareFactor, number>()
  for (const e of entries) {
    if (e.date < from || e.date > to) continue
    for (const f of cleanFactors(e.contributors)) counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  return cleanFactors([...counts.keys()])
    .map((factor) => ({ factor, days: counts.get(factor)! }))
    .sort((a, b) => b.days - a.days)
}
