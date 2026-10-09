// What came before a flare, described and nothing more: the person's own
// figures for the 3 days before it, next to their usual, and the treatment
// changes of the 14 days before. Nothing is picked out as "unusual". Tried:
// flagging what stood out by one standard deviation, it flagged something
// before 37 % of the 3-day windows that precede no flare at all, and a
// reader would take each flag for a cause. Showing every measure, the
// contrary cases included, leaves nothing to fish for.

import type { LoggedEntry, Medication } from '../db/types'
import type { FlareEpisode } from './flares.ts'
import { shiftISO } from './medications.ts'
import { mean } from './report.ts'
import { treatmentEvents, type TreatmentEvent } from './treatmentEvents.ts'

export type { TreatmentEvent }

/** Measures on the person's own scales, in the order they are shown. Not the
 * day before's activity (too much and too little are both tied to pain, so
 * it has no better side) and not the weather (already its own section). */
export const CONTEXT_KEYS = ['sleepHours', 'sleepQuality', 'stressLevel', 'fatigueLevel', 'brainFog', 'moodLevel'] as const
export type ContextKey = (typeof CONTEXT_KEYS)[number]

export interface ContextOptions {
  /** Days before the flare that are described */
  windowDays: number
  /** Days of the usual level, before that window */
  usualDays: number
  /** Logged days needed in the window, and for the usual level */
  minWindow: number
  minUsual: number
  /** Treatment changes looked for this far before the flare */
  eventDays: number
}

export const DEFAULT_CONTEXT_OPTIONS: ContextOptions = { windowDays: 3, usualDays: 28, minWindow: 2, minUsual: 10, eventDays: 14 }

export interface ContextValue {
  /** Mean of the days before the flare; null with too few logged days */
  window: number | null
  /** Mean of the 28 days before that, flare days left out; null likewise */
  usual: number | null
}

export interface FlareContext {
  values: Record<ContextKey, ContextValue>
  /** Oldest first */
  events: TreatmentEvent[]
}

export function flareContext(
  episode: FlareEpisode,
  entries: LoggedEntry[],
  medications: Medication[],
  /** Every day inside a flare (`flareDaySet`), kept out of the usual level */
  flareDays: Set<string>,
  options: Partial<ContextOptions> = {}
): FlareContext {
  const o = { ...DEFAULT_CONTEXT_OPTIONS, ...options }
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const days = (from: number, count: number) => Array.from({ length: count }, (_, i) => shiftISO(episode.start, from + i))
  const windowDays = days(-o.windowDays, o.windowDays)
  const usualDays = days(-o.windowDays - o.usualDays, o.usualDays).filter((d) => !flareDays.has(d))

  const meanOf = (dates: string[], key: ContextKey, min: number): number | null => {
    const values = dates.map((d) => byDate.get(d)?.[key]).filter((v): v is number => typeof v === 'number')
    return values.length >= min ? mean(values) : null
  }
  const values = Object.fromEntries(
    CONTEXT_KEYS.map((key) => [key, { window: meanOf(windowDays, key, o.minWindow), usual: meanOf(usualDays, key, o.minUsual) }])
  ) as Record<ContextKey, ContextValue>

  const from = shiftISO(episode.start, -o.eventDays)
  const events = treatmentEvents(medications).filter((e) => e.date >= from && e.date < episode.start)
  return { values, events }
}
