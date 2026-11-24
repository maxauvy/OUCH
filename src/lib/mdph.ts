// « Mon dossier MDPH »: what the journal can bring to a request to the MDPH
// (the form, cerfa 15692*01) and to the doctor who fills in its medical
// certificate (cerfa 15695*01). Only counts of what was noted, over a period
// the person chooses, with the number of days noted: no rate, no box ticked
// for the doctor, no verdict. The notice of the certificate asks for « la
// régularité ou le caractère fluctuant des troubles »: that is what this shows.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry, Medication } from '../db/types.ts'
import { detectFlares } from './flares.ts'
import { daysBetween, shiftISO } from './dates.ts'
import { loggedEntries } from './loggedEntries.ts'
import { currentMedications, notedEffects } from './careSheet.ts'
import { currentLabel } from './renamedSuggestions.ts'
import fr from '../i18n/locales/fr.ts'
import en from '../i18n/locales/en.ts'

/** The periods offered, in months; 12 by default, as the form asks about the last 12 months. */
export const PERIODS = [3, 6, 12] as const
export type MdphPeriod = (typeof PERIODS)[number]
/** A day of strong pain: 7 out of 10 or more. */
export const STRONG = 7
/** Fewer days noted than this and a measure is left out: it would speak of too little. */
export const MIN_TRACKED = 14
/** The line on the chart: the certificate's « réguliers > 15 j par mois ». */
export const CERTIFICATE_LINE = 15

/** The needs of the form's part B2 (« Vos besoins dans la vie quotidienne », pages 6 and 7 of cerfa 15692*01) a pain can get in the way of,
 * in the form's order: life at home, getting about, social life. Left out: running expenses, budget, speaking, civic life, safety. */
export const GESTURES = ['hygiene', 'dressing', 'shopping', 'meals', 'eating', 'housework', 'health', 'moveHome', 'goOut', 'moveOut', 'vehicle', 'transport', 'leisure', 'social', 'family'] as const
export type MdphGesture = (typeof GESTURES)[number]
export const GESTURE_ANSWERS = ['often', 'sometimes', 'no'] as const
export type GestureAnswer = (typeof GESTURE_ANSWERS)[number]
export type MdphGestures = Partial<Record<MdphGesture, GestureAnswer>>

/** The day the period starts: the same day `months` months back, the next day (so 12 months end today). */
export function periodStart(today: string, months: number): string {
  const [y, m, d] = today.split('-').map(Number)
  const back = new Date(Date.UTC(y!, m! - 1 - months, 1))
  const last = new Date(Date.UTC(back.getUTCFullYear(), back.getUTCMonth() + 1, 0)).getUTCDate()
  back.setUTCDate(Math.min(d!, last))
  return shiftISO(back.toISOString().slice(0, 10), 1)
}

export interface MdphMonth {
  /** 'YYYY-MM' */
  month: string
  /** Days of the month inside the period (a month cut by its start or by today has fewer). */
  calendarDays: number
  logged: number
  flareDays: number
  strongDays: number
}

export interface MdphFlare {
  start: string
  end: string
  days: number
  ongoing: boolean
}

/** Count over the days where the measure was noted, and how many those are. */
export interface Tally {
  days: number
  tracked: number
}

/** The kiné, in either language, among the app's own suggestions of « what helped ». */
const CARE = [fr.entryForm.positiveActionsSuggestions[7], en.entryForm.positiveActionsSuggestions[7]].map((s) => s!.toLocaleLowerCase())
const isCare = (label: string) => CARE.includes(currentLabel(label.trim()).toLocaleLowerCase())

const tally = <T>(list: readonly T[], has: (e: T) => boolean, hit: (e: T) => boolean): Tally => {
  const kept = list.filter(has)
  return { days: kept.filter(hit).length, tracked: kept.length }
}

/** Everything the page and the sheet show, as data: the words come from the language. */
export function mdphData(input: { entries: readonly DailyEntry[]; medications: readonly Medication[]; today: string; months: number }) {
  const { entries, medications, today, months } = input
  const all = loggedEntries(entries.filter((e) => e.date <= today) as DailyEntry[]).sort((a, b) => a.date.localeCompare(b.date))
  const from = periodStart(today, months)
  // The journal may begin inside the period: it is read from its first day, and says so.
  const start = all.find((e) => e.date >= from)?.date ?? today
  const days = all.filter((e) => e.date >= start)
  const span = daysBetween(start, today) + 1

  // Flares are found on the whole journal (each needs the weeks before it), then kept when they touch the period.
  const flares: MdphFlare[] = detectFlares(all)
    .filter((f) => f.end >= start)
    .map((f) => ({ start: f.start, end: f.end, days: f.days, ongoing: f.ongoing }))
  const flareDays = new Set<string>()
  for (const f of flares) for (let d = f.start < start ? start : f.start; d <= f.end; d = shiftISO(d, 1)) flareDays.add(d)

  const monthsList: MdphMonth[] = []
  for (let d = start; d <= today; d = shiftISO(d, 1)) {
    const key = d.slice(0, 7)
    let m = monthsList.at(-1)
    if (m?.month !== key) monthsList.push((m = { month: key, calendarDays: 0, logged: 0, flareDays: 0, strongDays: 0 }))
    m.calendarDays++
    if (flareDays.has(d)) m.flareDays++
  }
  for (const e of days) {
    const m = monthsList.find((x) => x.month === e.date.slice(0, 7))!
    m.logged++
    if (e.painLevel >= STRONG) m.strongDays++
  }

  const sleeps = days.map((e) => e.sleepHours).filter((h): h is number => typeof h === 'number')
  return {
    start,
    span,
    logged: days.length,
    /** Whether the journal began after the start of the period asked for. */
    shorter: start > from,
    months: monthsList,
    flares,
    flareDayCount: flareDays.size,
    strong: { days: days.filter((e) => e.painLevel >= STRONG).length, tracked: days.length } as Tally,
    interference: tally(days, (e) => e.dailyInterference !== undefined, (e) => e.dailyInterference! >= STRONG),
    nights: tally(days, (e) => e.nightWakings !== undefined, (e) => e.nightWakings! >= 2),
    stiffness: tally(days, (e) => e.morningStiffness !== undefined, (e) => e.morningStiffness === '1to2h' || e.morningStiffness === 'gt2h'),
    sleep: sleeps.length >= MIN_TRACKED ? { hours: sleeps.reduce((a, b) => a + b, 0) / sleeps.length, tracked: sleeps.length } : null,
    restDays: days.filter((e) => e.restDay).length,
    careDays: days.filter((e) => (e.positiveActions ?? []).some(isCare)).length,
    treatments: currentMedications(medications),
    effects: notedEffects(medications, days),
  }
}
export type MdphData = ReturnType<typeof mdphData>

/** A measure is shown once it was noted on enough days. */
export const enough = (t: Tally) => t.tracked >= MIN_TRACKED

/** The gestures as kept: only the known ones, with a known answer. */
export function cleanMdphGestures(raw: unknown): MdphGestures | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: MdphGestures = {}
  for (const g of GESTURES) {
    const v = (raw as Record<string, unknown>)[g]
    if ((GESTURE_ANSWERS as readonly unknown[]).includes(v)) out[g] = v as GestureAnswer
  }
  return Object.keys(out).length ? out : undefined
}
