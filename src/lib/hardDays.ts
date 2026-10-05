// When to show the soft "these last days were harder" card on the day's page.
//
// It looks at the days before today only, so that logging today's pain
// neither makes it appear nor take it away mid-session. It shows on the
// first day the page is opened once a flare is under way, and not again for
// that flare: a person in a bad stretch is not reminded of it every morning.
// The ideas it recalls are the ones the person wrote down themselves on
// days of an earlier flare; nothing is suggested from outside.

import type { DailyEntry } from '../db/types'
import { detectFlares, type FlareEpisode } from './flares.ts'
import { shiftISO } from './medications.ts'

/** The flare the card was last shown for, kept in the settings. */
export interface HardDaysSeen {
  /** First day of that flare, which identifies it */
  start: string
  /** The day it was shown */
  date: string
  dismissed: boolean
}

export interface HardDaysCard {
  episode: FlareEpisode
  /** What helped on flare days, most frequent first; may be empty */
  helped: string[]
}

export const MAX_HELPED = 3

export function hardDaysCard(input: {
  entries: DailyEntry[]
  /** ISO date of today */
  today: string
  seen?: HardDaysSeen
  /** The person can switch the card off in the settings */
  enabled?: boolean
}): HardDaysCard | null {
  const { entries, today, seen, enabled = true } = input
  if (!enabled) return null

  const before = entries.filter((e) => e.date < today)
  const episodes = detectFlares(before, { asOf: shiftISO(today, -1) })
  const episode = episodes.find((e) => e.ongoing)
  if (!episode) return null

  // Once per flare: the day it first showed, unless it was dismissed.
  if (seen && seen.start === episode.start && (seen.dismissed || seen.date !== today)) return null

  return { episode, helped: helpedDuring(before, episodes) }
}

/** What the person noted as helping on days inside a flare. Free text, so
 * "Bain chaud" and "bain chaud " count as one; the first spelling is kept. */
export function helpedDuring(entries: DailyEntry[], episodes: FlareEpisode[]): string[] {
  const counts = new Map<string, { label: string; n: number }>()
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!episodes.some((ep) => e.date >= ep.start && e.date <= ep.end)) continue
    for (const action of new Set(e.positiveActions?.map((a) => a.trim()).filter(Boolean))) {
      const key = action.toLocaleLowerCase()
      const known = counts.get(key)
      if (known) known.n++
      else counts.set(key, { label: action, n: 1 })
    }
  }
  // Array.sort is stable: equal counts keep the order they first appeared in.
  return [...counts.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, MAX_HELPED)
    .map((c) => c.label)
}
