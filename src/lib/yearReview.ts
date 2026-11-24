// « Mon année »: once a year, the journal tells the person what they went
// through and what they did for themselves. Positive and true: no score, no
// streak, no comparison with the year before, nothing that underlines what
// was missing. Rest counts as much as movement. Each part is told only when
// the journal holds it; a short year (under a month noted) is not told at all.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry, GoodDayNote, PainWeatherLevel, PastConsultation } from '../db/types.ts'
import type { LeadTrial } from './leadTrial.ts'
import { detectFlares } from './flares.ts'
import { levelForPainValue } from './painWeather.ts'
import { loggedEntries } from './loggedEntries.ts'
import { daysBetween, shiftISO } from './dates.ts'

/** Fewer days noted in the year than this, and there is no year to tell yet. */
export const MIN_DAYS = 30
/** A stretch without a flare is told from this many days. */
export const MIN_CALM = 7
/** What helped is told once it was noted on this many days. */
export const MIN_HELPED = 3

/** The year to tell on `today`: this one in December, the last one in January; none the rest of the time. */
export function reviewYear(today: string): number | null {
  const [y, m] = today.split('-').map(Number)
  if (m === 12) return y!
  if (m === 1) return y! - 1
  return null
}

/** The card on the day's page: from 15 December to 15 January, until it is opened or put off for that year. */
export function entryCardYear(today: string, seen: number | undefined): number | null {
  const year = reviewYear(today)
  if (year === null) return null
  const md = today.slice(5)
  const inWindow = md >= '12-15' || md <= '01-15'
  return inWindow && seen !== year ? year : null
}

export interface YearReview {
  year: number
  /** Days noted in the year. */
  logged: number
  /** The first day noted in the year: the story says « since » when it is not 1 January. */
  first: string
  /** Each noted day's weather, for the sky of the year. */
  days: { date: string; level: PainWeatherLevel }[]
  /** Days at the two gentlest weathers. */
  gentle: number
  /** How long each flare of the year that came to an end lasted, in order. */
  flares: number[]
  /** The longest run of noted days in a row with no flare, when it is worth telling. */
  calm: { start: string; end: string; days: number } | null
  /** What the person noted as helping most often, as typed, with its days. */
  helped: { label: string; days: number }[]
  /** The trials finished in the year. */
  trials: string[]
  /** The note for harder days, when written in the year. */
  wroteNote: boolean
  /** Appointments the person noted in the year. */
  appointments: number
}

/** The year as the journal holds it; null under `MIN_DAYS` noted days. */
export function yearReview(input: {
  entries: readonly DailyEntry[]
  year: number
  /** Whether flares apply to the person's illnesses (migraine alone has none). */
  flaresApply: boolean
  trials?: readonly LeadTrial[]
  note?: GoodDayNote
  appointments?: readonly PastConsultation[]
  /** The last day counted: today, so that a December story stops there. */
  today: string
}): YearReview | null {
  const { year, today } = input
  const all = loggedEntries(input.entries as DailyEntry[]).sort((a, b) => a.date.localeCompare(b.date))
  const inYear = (d: string) => d.startsWith(`${year}-`) && d <= today
  const days = all.filter((e) => inYear(e.date))
  if (days.length < MIN_DAYS) return null

  const episodes = input.flaresApply ? detectFlares(all.filter((e) => e.date <= today)) : []
  const flareDays = new Set<string>()
  for (const f of episodes) for (let d = f.start; d <= f.end; d = shiftISO(d, 1)) flareDays.add(d)

  // The longest calm stretch: noted days with no flare day, a single day not noted between two of them
  // does not break it (a day off from the journal is not a day of pain); counted in calendar days.
  let calm: YearReview['calm'] = null
  const run = { start: '', end: '', days: 0 }
  for (const e of days) {
    if (flareDays.has(e.date)) {
      run.days = 0
      continue
    }
    if (run.days > 0 && e.date <= shiftISO(run.end, 2)) run.end = e.date
    else Object.assign(run, { start: e.date, end: e.date })
    run.days = daysBetween(run.start, run.end) + 1
    if (!calm || run.days > calm.days) calm = { ...run }
  }

  const counts = new Map<string, { label: string; days: number }>()
  for (const e of days) {
    for (const raw of new Set((e.positiveActions ?? []).map((a) => a.trim()).filter(Boolean))) {
      const key = raw.toLocaleLowerCase()
      const c = counts.get(key) ?? { label: raw, days: 0 }
      c.days++
      counts.set(key, c)
    }
  }

  const levels = days.map((e) => ({ date: e.date, level: levelForPainValue(e.painLevel) }))
  return {
    year,
    logged: days.length,
    first: days[0]!.date,
    days: levels,
    gentle: levels.filter((d) => d.level <= 2).length,
    flares: episodes.filter((f) => !f.ongoing && !f.endUnknown && inYear(f.end)).map((f) => f.days),
    calm: calm && calm.days >= MIN_CALM ? calm : null,
    helped: [...counts.values()]
      .filter((c) => c.days >= MIN_HELPED)
      .sort((a, b) => b.days - a.days || a.label.localeCompare(b.label))
      .slice(0, 3),
    trials: (input.trials ?? []).filter((t) => inYear(t.end)).map((t) => t.action),
    wroteNote: !!input.note && inYear(input.note.date),
    appointments: (input.appointments ?? []).filter((a) => inYear(a.date)).length,
  }
}

/** The line for the year to come: one line, a few words. */
export const MAX_WISH = 80

export function cleanWish(text: unknown): string {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, MAX_WISH) : ''
}

/** The line for the year to come, read from a backup: a real year and some text, or nothing. */
export function yearWishFromBackup(raw: unknown): { year: number; text: string } | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const { year, text } = raw as Record<string, unknown>
  const t = cleanWish(text)
  return typeof year === 'number' && Number.isInteger(year) && year >= 2000 && year <= 2200 && t ? { year, text: t } : undefined
}
