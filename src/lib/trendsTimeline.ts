// What happened in the chosen range, as one list under the pain curve: the
// flares, the changes of treatment, the one-week trials and the appointments that took place, newest first.
// Pure (no React, no Dexie), so it can be tested with plain Node.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { PastConsultation } from '../db/types.ts'
import type { FlareEpisode } from './flares.ts'
import type { LeadTrial } from './leadTrial.ts'
import type { ResolvedFlare } from './markedFlares.ts'
import type { TreatmentEvent } from './treatmentEvents.ts'

export type TimelineItem =
  | { kind: 'flare'; date: string; episode: FlareEpisode }
  | { kind: 'marked'; date: string; flare: ResolvedFlare }
  | { kind: 'treatment'; date: string; event: TreatmentEvent }
  | { kind: 'trial'; date: string; trial: LeadTrial; running: boolean }
  | { kind: 'appointment'; date: string; appointment: PastConsultation }

const ORDER: Record<TimelineItem['kind'], number> = { flare: 0, marked: 1, trial: 2, treatment: 3, appointment: 4 }

export interface TimelineInput {
  /** First and last day of the range (ISO dates, inclusive). */
  from: string
  to: string
  /** Whether the flare reading applies and a flare can be found at all. */
  flares: FlareEpisode[]
  /** The periods the person marked themselves, as they stand today. */
  marked?: ResolvedFlare[]
  /** Every start, change and stop of the registry (`treatmentEvents`), or none when medications are not followed. */
  events: TreatmentEvent[]
  /** The appointments that took place (`pastConsultations`), or none. */
  appointments?: PastConsultation[]
  /** Trials, past and under way. */
  history: LeadTrial[]
  current: LeadTrial | undefined
  today: string
}

/** What touches the range, newest first (by the day it began); on the same day a flare comes before a period the person marked, that before a trial, a trial before a treatment, a treatment before the appointment (read top down, the change comes first, then the visit that may have decided it). */
export function timelineItems({ from, to, flares, marked = [], events, appointments = [], history, current, today }: TimelineInput): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const episode of flares) if (episode.end >= from && episode.start <= to) items.push({ kind: 'flare', date: episode.start, episode })
  for (const flare of marked) if (flare.last >= from && flare.start <= to) items.push({ kind: 'marked', date: flare.start, flare })
  for (const event of events) if (event.date >= from && event.date <= to) items.push({ kind: 'treatment', date: event.date, event })
  for (const appointment of appointments) if (appointment.date >= from && appointment.date <= to) items.push({ kind: 'appointment', date: appointment.date, appointment })
  const trials = current ? [...history.filter((t) => t.start !== current.start || t.key !== current.key), current] : history
  for (const trial of trials) {
    if (trial.end < from || trial.start > to) continue
    items.push({ kind: 'trial', date: trial.start, trial, running: trial === current && trial.end >= today })
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || ORDER[a.kind] - ORDER[b.kind])
}

/** The trials to draw as a band under the curve: the same ones, as stretches of days. */
export function trialSpans(items: readonly TimelineItem[]): { from: string; to: string }[] {
  return items.flatMap((i) => (i.kind === 'trial' ? [{ from: i.trial.start, to: i.trial.end }] : []))
}

/** The periods the person marked, as stretches of days for the curve. */
export function markedSpans(items: readonly TimelineItem[]): { from: string; to: string }[] {
  return items.flatMap((i) => (i.kind === 'marked' ? [{ from: i.flare.start, to: i.flare.last }] : []))
}

/** The last change of treatment up to today, of any kind; undefined when there is none. */
export function lastTreatmentEvent(events: readonly TreatmentEvent[], today: string): TreatmentEvent | undefined {
  return events.filter((e) => e.date <= today).at(-1)
}
