// A look at tomorrow's pressure, read against the person's own diary. Two things
// are needed to say anything: the forecast says the pressure will fall tomorrow,
// and on the days it fell like that before, the person's pain was harder than
// usual more often than chance gives. Nothing here says the pressure causes the
// pain: it describes a diary, and the research finds modest links that differ
// a lot from one person to the next. When the diary shows nothing beyond chance
// (or has too few days), nothing is said at all.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry } from '../db/types.ts'
import { shiftISO } from './dates.ts'
import { binomialQuantile, usualBefore } from './pacing.ts'

/** A fall of the day's mean pressure from one day to the next counts from this many hPa (a threshold of OUCH's, not a clinical one). */
export const DROP_HPA = 5
/** Days (with the pressure of the day and of the day before, and a usual level to compare the pain with) needed before the diary is read. */
export const MIN_DAYS = 30
/** Days of falling pressure needed to say anything of them. */
export const MIN_DROPS = 5
/** The diary is read over this many days back. */
export const WINDOW_DAYS = 180
/** The band of chance: from the 10th to the 90th percentile, as for the days after the most active ones. */
const LOW = 0.1
const HIGH = 0.9

/** What was fetched for a place: the mean pressure of a few days (hPa), kept on the device for the day. */
export interface ForecastCache {
  /** The day it was fetched (ISO). */
  fetchedOn: string
  days: { date: string; pressureHpa: number }[]
}

export interface ForecastReading {
  /** The fall tomorrow, in hPa (a positive number). */
  fall: number
  /** Days of falling pressure in the diary, and of them those harder than usual. */
  k: number
  observed: number
  /** The band chance gives for `k` days. */
  low: number
  high: number
}

/** Reads the answer of Open-Meteo's forecast: the mean pressure of each day, whatever is missing left out. */
export function parseForecast(json: unknown): ForecastCache['days'] {
  const daily = (json as { daily?: { time?: unknown; pressure_msl_mean?: unknown } } | null)?.daily
  if (!daily || !Array.isArray(daily.time) || !Array.isArray(daily.pressure_msl_mean)) return []
  const days: ForecastCache['days'] = []
  daily.time.forEach((date, i) => {
    const p = (daily.pressure_msl_mean as unknown[])[i]
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof p === 'number' && Number.isFinite(p)) days.push({ date, pressureHpa: Math.round(p) })
  })
  return days
}

/** The fall expected tomorrow (hPa, positive), or null when tomorrow is not a fall of at least `DROP_HPA` or the forecast does not cover both days. */
export function fallTomorrow(cache: ForecastCache | undefined, today: string): number | null {
  const now = cache?.days.find((d) => d.date === today)
  const next = cache?.days.find((d) => d.date === shiftISO(today, 1))
  if (!now || !next) return null
  const fall = now.pressureHpa - next.pressureHpa
  return fall >= DROP_HPA ? fall : null
}

/** What the diary says about the days the pressure fell, against chance; null when there is nothing beyond chance to say. */
export function diaryOfFalls(entries: readonly DailyEntry[], today: string): Pick<ForecastReading, 'k' | 'observed' | 'low' | 'high'> | null {
  const from = shiftISO(today, -WINDOW_DAYS)
  const window = entries.filter((e) => e.date >= from && e.date < today)
  const pressure = new Map<string, number>()
  const pain = new Map<string, number>()
  for (const e of window) {
    if (typeof e.weather?.pressureHpa === 'number') pressure.set(e.date, e.weather.pressureHpa)
    if (typeof e.painLevel === 'number') pain.set(e.date, e.painLevel)
  }
  let days = 0
  let harderDays = 0
  let k = 0
  let observed = 0
  for (const [date, p] of pressure) {
    const before = pressure.get(shiftISO(date, -1))
    const level = pain.get(date)
    if (before === undefined || level === undefined) continue
    const usual = usualBefore(pain, date)
    if (usual === null) continue
    days++
    const harder = level > usual
    if (harder) harderDays++
    if (before - p >= DROP_HPA) {
      k++
      if (harder) observed++
    }
  }
  if (days < MIN_DAYS || k < MIN_DROPS) return null
  const rate = harderDays / days
  const low = binomialQuantile(k, rate, LOW)
  const high = binomialQuantile(k, rate, HIGH)
  return observed > high ? { k, observed, low, high } : null
}

/** The line for the day's page: tomorrow's pressure falls, and the diary shows more harder days after such falls than chance gives. */
export function forecastReading(entries: readonly DailyEntry[], cache: ForecastCache | undefined, today: string): ForecastReading | null {
  const fall = fallTomorrow(cache, today)
  if (fall === null) return null
  const diary = diaryOfFalls(entries, today)
  return diary ? { fall, ...diary } : null
}

/** Whether the forecast on this device is from today. */
export function isFresh(cache: ForecastCache | undefined, today: string): boolean {
  return !!cache && cache.fetchedOn === today && cache.days.some((d) => d.date === shiftISO(today, 1))
}
