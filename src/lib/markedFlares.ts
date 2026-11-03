// The difficult periods the person marks themselves, besides the ones the
// app detects (lib/flares.ts). Kept apart: a marked period says what the
// person lived, a detected one says what the pain levels did, and neither
// stands in for the other. The factors are what the person thinks played a
// part, nothing the app measured.

import type { FlareFactor, MarkedFlare } from '../db/types.ts'
import { FLARE_FACTORS } from '../db/types.ts'
import { daysBetween, shiftISO } from './dates.ts'

export const MAX_MARKED = 50
export const MAX_NOTE_LENGTH = 140
/** A period nobody closes ends by itself after this many days (the day it began counts). */
export const AUTO_CLOSE_DAYS = 14

export interface ResolvedFlare extends MarkedFlare {
  /** Last day, closed by the person or, failing that, by the clock. */
  last: string
  ongoing: boolean
  days: number
}

export function resolveMarked(f: MarkedFlare, today: string): ResolvedFlare {
  const limit = shiftISO(f.start, AUTO_CLOSE_DAYS - 1)
  const ongoing = !f.end && today <= limit
  const last = f.end ?? (today < limit ? today : limit)
  return { ...f, last, ongoing, days: daysBetween(f.start, last) + 1 }
}

/** The one still open, if any: the page offers to mark a new one only when none is. */
export function ongoingMarked(list: readonly MarkedFlare[] | undefined, today: string): ResolvedFlare | null {
  for (const f of list ?? []) {
    const r = resolveMarked(f, today)
    if (r.ongoing) return r
  }
  return null
}

export function cleanNote(s: string | undefined): string | undefined {
  const note = s?.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_LENGTH)
  return note || undefined
}

export function cleanFactors(v: readonly string[] | undefined): FlareFactor[] {
  return FLARE_FACTORS.filter((f) => v?.includes(f))
}

/** A new period, newest first. Nothing changes if one is already open, if the day is in the future, or if the list is full. */
export function startMarked(list: readonly MarkedFlare[] | undefined, input: { start: string; factors: readonly string[]; note?: string }, today: string): MarkedFlare[] {
  const current = list ?? []
  if (input.start > today || ongoingMarked(current, today) || current.length >= MAX_MARKED) return [...current]
  const note = cleanNote(input.note)
  const flare: MarkedFlare = { start: input.start, factors: cleanFactors(input.factors), ...(note ? { note } : {}) }
  return [flare, ...current].sort((a, b) => b.start.localeCompare(a.start))
}

/** The open period ends today. */
export function endMarked(list: readonly MarkedFlare[] | undefined, today: string): MarkedFlare[] {
  const open = ongoingMarked(list, today)
  return (list ?? []).map((f) => (open && f.start === open.start && !f.end ? { ...f, end: today } : f))
}

/** The open period was marked by mistake: it goes. */
export function removeOngoing(list: readonly MarkedFlare[] | undefined, today: string): MarkedFlare[] {
  const open = ongoingMarked(list, today)
  return (list ?? []).filter((f) => !(open && f.start === open.start && !f.end))
}

export function removeMarked(list: readonly MarkedFlare[] | undefined, start: string): MarkedFlare[] {
  return (list ?? []).filter((f) => f.start !== start)
}

export function markedDaySet(list: readonly MarkedFlare[] | undefined, today: string): Set<string> {
  const days = new Set<string>()
  for (const f of list ?? []) {
    const r = resolveMarked(f, today)
    for (let d = r.start; d <= r.last; d = shiftISO(d, 1)) days.add(d)
  }
  return days
}

/** The periods that touch a range, oldest first. */
export function markedOverlapping(list: readonly MarkedFlare[] | undefined, from: string, to: string, today: string): ResolvedFlare[] {
  return (list ?? [])
    .map((f) => resolveMarked(f, today))
    .filter((r) => r.last >= from && r.start <= to)
    .sort((a, b) => a.start.localeCompare(b.start))
}
