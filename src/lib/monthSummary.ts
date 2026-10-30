// The calm summary of the month that just ended, brought to the day's page in the
// first days of the next one: the trials seen through, the softest week, the way
// back to the usual level after the flares. Nothing is compared with anyone, and
// a line with nothing behind it is left out. Pure (no React, no Dexie), so it can
// be tested with plain Node.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import type { FlareEpisode } from './flares.ts'
import type { LeadTrial } from './leadTrial.ts'
import { shiftISO } from './dates.ts'

/** The summary of a month is brought during the first days of the next. */
export const SUMMARY_DAYS = 7
/** Fewest logged days in the month for a summary to say anything. */
export const MIN_MONTH_DAYS = 10
/** Fewest logged days in a week for it to be called the softest. */
const MIN_WEEK_DAYS = 5
/** Fewest lines worth a summary. */
const MIN_LINES = 2

export interface MonthSummary {
  /** The month summed up, 'YYYY-MM'. */
  month: string
  /** Its first and last day (ISO dates). */
  first: string
  last: string
  /** Trials of a week that ended in the month. */
  trials: number
  /** The week of seven days from the 1st (the last one is shorter, so it is left out) with the lowest mean pain; null when fewer than two weeks have enough days. */
  softestWeek: { start: string; end: string; mean: number } | null
  /** Flares that ended in the month and whose way back to the usual level is known: how many, and the mean days it took. */
  back: { flares: number; days: number } | null
}

const lastDayOf = (month: string): string => shiftISO(`${shiftMonth(month, 1)}-01`, -1)

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 7)
}

/** The summary of the month before `today`, when today is one of its first days, the month has enough logged days and at least two lines to say. */
export function monthSummary({ today, entries, history, episodes }: { today: string; entries: readonly LoggedEntry[]; history: readonly LeadTrial[]; episodes: readonly FlareEpisode[] }): MonthSummary | null {
  if (Number(today.slice(8)) > SUMMARY_DAYS) return null
  const month = shiftMonth(today.slice(0, 7), -1)
  const first = `${month}-01`
  const last = lastDayOf(month)
  const inMonth = entries.filter((e) => e.date >= first && e.date <= last)
  if (inMonth.length < MIN_MONTH_DAYS) return null

  const trials = history.filter((t) => t.end >= first && t.end <= last).length

  const weeks: { start: string; end: string; mean: number }[] = []
  for (let start = first; shiftISO(start, 6) <= last; start = shiftISO(start, 7)) {
    const end = shiftISO(start, 6)
    const days = inMonth.filter((e) => e.date >= start && e.date <= end)
    if (days.length >= MIN_WEEK_DAYS) weeks.push({ start, end, mean: days.reduce((s, e) => s + e.painLevel, 0) / days.length })
  }
  const softestWeek = weeks.length >= 2 ? weeks.reduce((best, w) => (w.mean < best.mean ? w : best)) : null

  const backs = episodes.filter((e) => !e.ongoing && !e.endUnknown && (e.recoveryDays ?? 0) >= 1 && e.end >= first && e.end <= last)
  const back = backs.length ? { flares: backs.length, days: Math.round(backs.reduce((s, e) => s + (e.recoveryDays ?? 0), 0) / backs.length) } : null

  const lines = (trials > 0 ? 1 : 0) + (softestWeek ? 1 : 0) + (back ? 1 : 0)
  return lines >= MIN_LINES ? { month, first, last, trials, softestWeek, back } : null
}
