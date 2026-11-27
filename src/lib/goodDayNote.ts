// « Le mot des bons jours »: a few lines the person writes on a calmer day,
// for the person they will be on a harder one. It comes back during a flare,
// with what the journal already knows: the flares before it all came to an
// end. Nothing is guessed: the lengths are those of the flares detected in
// the journal, and the sentence says nothing when there are fewer than two.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { GoodDayNote, LoggedEntry } from '../db/types.ts'
import { detectFlares, type FlareEpisode } from './flares.ts'
import { shiftISO } from './dates.ts'

/** 'YYYY-MM-DD' naming a real calendar day (as in backupSanitize, which imports this file). */
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v

export const MAX_NOTE = 500
/** The invitation to write waits this many days after a flare ends, then lets it go. */
export const INVITE_DAYS = 7
/** The fewest past flares the sentence speaks of: one alone says nothing about « all ». */
export const MIN_PAST = 2

const tidy = (s: unknown): string => (typeof s === 'string' ? s.trim().replace(/\r\n/g, '\n').slice(0, MAX_NOTE).trim() : '')

/** What was typed, tidied and dated; undefined when nothing is left, so an emptied note leaves no trace. */
export function cleanNote(text: unknown, date: string): GoodDayNote | undefined {
  const t = tidy(text)
  return t ? { text: t, date } : undefined
}

/** A note read from a backup: a string and a real date, or nothing. */
export function noteFromBackup(raw: unknown): GoodDayNote | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const { text, date } = raw as Record<string, unknown>
  return isDay(date) ? cleanNote(text, date) : undefined
}

/** How long each flare that came to an end lasted, in days, oldest first. A
 * flare whose end fell in a gap of the journal is left out: its length is not known. */
export function pastFlareLengths(episodes: readonly FlareEpisode[]): number[] {
  return episodes.filter((e) => !e.ongoing && !e.endUnknown).map((e) => e.days)
}

/** The flares of the journal as of yesterday: what is logged today changes nothing, as for the soft card. */
export function flaresAsOfYesterday(entries: readonly LoggedEntry[], today: string): FlareEpisode[] {
  return detectFlares(
    entries.filter((e) => e.date < today),
    { asOf: shiftISO(today, -1) }
  )
}

/** What the sentence says: how many flares ended, the shortest and the longest. Null below `MIN_PAST`. */
export function flareSpan(lengths: readonly number[]): { count: number; shortest: number; longest: number } | null {
  if (lengths.length < MIN_PAST) return null
  return { count: lengths.length, shortest: Math.min(...lengths), longest: Math.max(...lengths) }
}

/** The flare that just ended, when the day's page should offer to write a note:
 * no flare under way, one ended in the last `INVITE_DAYS` days, no note kept
 * yet, and the invitation not already answered for that flare (written, or « later »). */
export function noteInvite(input: {
  entries: readonly LoggedEntry[]
  today: string
  note?: GoodDayNote
  /** First day of the flare the invitation was last answered for. */
  answered?: string
  enabled?: boolean
}): FlareEpisode | null {
  const { entries, today, note, answered, enabled = true } = input
  if (!enabled || note) return null
  const episodes = flaresAsOfYesterday(entries, today)
  if (episodes.some((e) => e.ongoing)) return null
  const last = episodes.filter((e) => !e.endUnknown).at(-1)
  if (!last || last.end < shiftISO(today, -INVITE_DAYS) || last.start === answered) return null
  return last
}

/** « 12 octobre », with the year when it is not this one. */
export function noteDate(iso: string, locale: string, today: string): string {
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })
}
