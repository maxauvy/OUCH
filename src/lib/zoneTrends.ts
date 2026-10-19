// What the zones can say over time, in Trends. Descriptive, with the number of
// days behind every figure, and silent when the days are too few: the same
// lesson as the flares and the weekday card, where a pattern that looks clear
// after a few days is mostly chance.

import { BODY_ZONES, type BodyZone } from '../db/types.ts'
import { cleanZones } from './bodyZones.ts'
import { shiftISO } from './medications.ts'

interface DayZones {
  date: string
  painLocations?: readonly string[]
}

/** Flare days needed before the zones of flare days are compared with the others. */
export const MIN_FLARE_DAYS = 6
/** Other logged days needed for the same comparison. */
export const MIN_OTHER_DAYS = 15
/** A zone must be on at least this many flare days to be named… */
const MIN_ZONE_FLARE_DAYS = 3
/** …and be reported this much more often (share of days, as points) than on the other days. */
const MIN_GAP = 0.25
const MAX_ROWS = 5

export interface FlareZoneRow {
  zone: BodyZone
  flareDays: number
  otherDays: number
}

export interface FlareZoneComparison {
  flareDays: number
  otherDays: number
  /** Enough days on both sides to say anything. */
  enough: boolean
  /** Share of flare days on which each zone is reported, for the silhouette. */
  flareShares: Map<BodyZone, number>
  /** The zones reported clearly more often on flare days, biggest gap first; empty when none stands out. */
  rows: FlareZoneRow[]
}

function countZones(days: readonly DayZones[]): Map<BodyZone, number> {
  const counts = new Map<BodyZone, number>()
  for (const d of days) for (const z of cleanZones(d.painLocations ?? [])) counts.set(z, (counts.get(z) ?? 0) + 1)
  return counts
}

/** Zones on the logged days inside a flare against the logged days outside one. Days of one flare are not independent: the card says so, and names a zone only when the gap is large. */
export function compareFlareZones(entries: readonly DayZones[], flareDays: ReadonlySet<string>): FlareZoneComparison {
  const flare = entries.filter((e) => flareDays.has(e.date))
  const other = entries.filter((e) => !flareDays.has(e.date))
  const fc = countZones(flare)
  const oc = countZones(other)
  const enough = flare.length >= MIN_FLARE_DAYS && other.length >= MIN_OTHER_DAYS
  const rows: FlareZoneRow[] = enough
    ? [...fc]
        .map(([zone, f]) => ({ zone, flareDays: f, otherDays: oc.get(zone) ?? 0 }))
        .filter((r) => r.flareDays >= MIN_ZONE_FLARE_DAYS && r.flareDays / flare.length - r.otherDays / other.length >= MIN_GAP)
        .sort((a, b) => b.flareDays / flare.length - b.otherDays / other.length - (a.flareDays / flare.length - a.otherDays / other.length) || BODY_ZONES.indexOf(a.zone) - BODY_ZONES.indexOf(b.zone))
        .slice(0, MAX_ROWS)
    : []
  return {
    flareDays: flare.length,
    otherDays: other.length,
    enough,
    flareShares: new Map([...fc].map(([z, n]) => [z, flare.length ? n / flare.length : 0])),
    rows,
  }
}

export const STRIP_WEEKS = 13
const STRIP_ROWS = 6
/** Logged days in the window before the strips are worth drawing. */
const MIN_STRIP_DAYS = 21

export interface ZoneStripWeek {
  /** First and last calendar day of the week (ISO dates). */
  start: string
  end: string
  /** Logged days in the week. */
  logged: number
  /** Part of the week is inside a flare. */
  flare: boolean
}

export interface ZoneStrips {
  weeks: ZoneStripWeek[]
  /** The most reported zones of the window, with days reported and days logged in each week. */
  rows: { zone: BodyZone; cells: { days: number; logged: number }[] }[]
}

/** One row per zone and one cell per week, the last week ending at `end`. Null when the window has too few logged days or no zone at all. */
export function zoneStrips(entries: readonly DayZones[], end: string, flareDays: ReadonlySet<string>, weeks = STRIP_WEEKS): ZoneStrips | null {
  const first = shiftISO(end, -(weeks * 7 - 1))
  const inWindow = entries.filter((e) => e.date >= first && e.date <= end)
  if (inWindow.length < MIN_STRIP_DAYS) return null
  const totals = countZones(inWindow)
  totals.delete('generalized')
  const top = [...totals]
    .sort((a, b) => b[1] - a[1] || BODY_ZONES.indexOf(a[0]) - BODY_ZONES.indexOf(b[0]))
    .slice(0, STRIP_ROWS)
    .map(([z]) => z)
  if (!top.length) return null
  const weekList: ZoneStripWeek[] = Array.from({ length: weeks }, (_, w) => {
    const start = shiftISO(first, w * 7)
    const last = shiftISO(start, 6)
    let flare = false
    for (let d = start; d <= last && !flare; d = shiftISO(d, 1)) flare = flareDays.has(d)
    return { start, end: last, logged: inWindow.filter((e) => e.date >= start && e.date <= last).length, flare }
  })
  return {
    weeks: weekList,
    rows: top.map((zone) => ({
      zone,
      cells: weekList.map((wk) => {
        const days = inWindow.filter((e) => e.date >= wk.start && e.date <= wk.end)
        return { days: days.filter((e) => cleanZones(e.painLocations ?? []).includes(zone)).length, logged: days.length }
      }),
    })),
  }
}
