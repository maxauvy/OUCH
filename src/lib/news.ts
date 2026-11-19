import type { DailyEntry, Illness, LoggedEntry, MarkedFlare } from '../db/types.ts'
import { daysBetween } from './dates.ts'
import { flaresApply } from './flares.ts'
import { flareUnderWay } from './hardDays.ts'
import { ongoingMarked } from './markedFlares.ts'
import { isRestDay } from './restDay.ts'

/**
 * « Nouveautés »: what OUCH has to say about itself (a change in the app, a
 * word of thanks), gathered behind one button next to the settings. Each item
 * opens its own sheet. Newest first.
 */
export type NewsId = 'thanks' | 'zones'

/** The word of thanks goes to the people already there when it came out:
 * at least this many days logged up to the cutoff. Someone who starts later
 * would read "thank you for being here" on their first day. */
export const THANKS_MIN_DAYS = 7
/** The day the word of thanks came out: days logged after it do not count. */
export const THANKS_CUTOFF = '2026-11-20'

export function thanksEligible(logged: readonly Pick<LoggedEntry, 'date'>[], cutoff = THANKS_CUTOFF, min = THANKS_MIN_DAYS): boolean {
  return logged.filter((e) => e.date <= cutoff).length >= min
}

/** Whole days since the first logged day, that day included: "you have been logging for n days". */
export function daysWithOuch(logged: readonly Pick<LoggedEntry, 'date'>[], today: string): number {
  if (logged.length === 0) return 0
  const first = logged.reduce((min, e) => (e.date < min ? e.date : min), logged[0].date)
  return Math.max(1, daysBetween(first, today) + 1)
}

export interface NewsState {
  /** The journal holds zones of the first versions. */
  hasOldZones: boolean
  zonesNoticeSeen: boolean
  thanksEligible: boolean
  /** The items opened on this device. */
  seen: readonly string[]
}

/** The items the sheet lists, newest first. The zones notice is listed for everyone, as it was in Settings. */
export function newsItems(state: NewsState): NewsId[] {
  return [...(state.thanksEligible ? (['thanks'] as const) : []), 'zones']
}

/** The items not yet read. The zones notice only counts for a journal it was written for. */
export function unreadNews(state: NewsState): NewsId[] {
  return newsItems(state).filter((id) => {
    if (id === 'zones') return state.hasOldZones && !state.zonesNoticeSeen && !state.seen.includes('zones')
    return !state.seen.includes(id)
  })
}

/** The item that opens on its own, once: the oldest unread one first, so the zones notice keeps its place. Never on a quiet day. */
export function newsToOpen(state: NewsState, quiet: boolean): NewsId | null {
  if (quiet) return null
  const unread = unreadNews(state)
  return unread.length ? unread[unread.length - 1] : null
}

/** A day the app keeps quiet: a flare under way, a harder stretch the person marked, or a quiet day they chose. Same reading as the day's list. */
export function quietDay(input: { illnesses: readonly Illness[]; logged: LoggedEntry[]; all: readonly DailyEntry[]; markedFlares: readonly MarkedFlare[] | undefined; today: string }): boolean {
  return (flaresApply(input.illnesses) && flareUnderWay(input.logged, input.today)) || !!ongoingMarked(input.markedFlares, input.today) || isRestDay(input.all, input.today)
}
