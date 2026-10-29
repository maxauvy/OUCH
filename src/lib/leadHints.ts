// What brings a lead to the person without them opening Trends: the list on the
// day's page (see todayMessages.ts) and a dot on the Trends tab. Each is
// switchable, and each is quiet during a flare. What was already shown is kept
// per device, like the other "seen" markers: it says nothing about the diary.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import { actionKey, type Lead } from './leads.ts'
import type { LeadTrial } from './leadTrial.ts'
import { shiftISO } from './dates.ts'
import type { MessageLaterMap } from './todayMessages.ts'

export interface LeadsSeen {
  /** The leads on Trends's card when it was last opened: the dot shows what is not among them. */
  trends: string[]
  /** Trials the person said "not now" to. */
  declined: string[]
  /** When each trial was last offered again, by lead key: the next offer waits. */
  repeatShown?: Record<string, string>
  /** What was set aside or done in the list of the day's page, by message key. */
  later?: MessageLaterMap
}

export const NO_LEADS_SEEN: LeadsSeen = { trends: [], declined: [] }
const MAX_KEYS = 60

/** `keys` with `add` after them, without repeats, the oldest dropped past a cap. */
export function remember(keys: string[], add: string[]): string[] {
  return [...new Set([...keys, ...add])].slice(-MAX_KEYS)
}

/** The dot on the Trends tab: a lead on its card that it has not shown yet, and that the list on
 * the day's page has not brought (`announced`: the ones on that list, or set aside from it). */
export function trendsDot(input: { shown: Lead[]; seen: LeadsSeen | undefined; enabled: boolean; announced?: readonly string[] }): boolean {
  const { shown, seen, enabled, announced = [] } = input
  return enabled && shown.some((l) => !seen?.trends.includes(l.key) && !announced.includes(l.key))
}

/** A trial is offered again this long after it ended, and no sooner than this after the last offer. */
export const REPEAT_AFTER_DAYS = 56
/** Only for an action still in the notes: noted at least once in the last days. */
export const REPEAT_RECENT_DAYS = 28

/** The trial to offer again on the day's page, if any: one closed at least
 * eight weeks ago, whose action is still part of the person's days, outside a
 * flare and with no trial under way. One at a time. Doing something over a long
 * time, not once, is the point. */
export function trialToRepeat(input: {
  history: LeadTrial[] | undefined
  current: LeadTrial | undefined
  seen: LeadsSeen | undefined
  entries: LoggedEntry[]
  today: string
  enabled: boolean
  /** A flare is under way, or the day's pain is not logged yet */
  quiet: boolean
}): LeadTrial | null {
  const { history, current, seen, entries, today, enabled, quiet } = input
  if (!enabled || quiet || current || !history?.length) return null
  const latest = new Map<string, LeadTrial>()
  for (const t of history) if (!latest.has(t.key) || t.end > latest.get(t.key)!.end) latest.set(t.key, t)
  const since = shiftISO(today, -REPEAT_RECENT_DAYS)
  const recent = new Set(entries.filter((e) => e.date >= since && e.date <= today).flatMap((e) => (e.positiveActions ?? []).map(actionKey)))
  const due = [...latest.values()]
    .filter((t) => {
      const last = seen?.repeatShown?.[t.key]
      return (
        today >= shiftISO(t.end, REPEAT_AFTER_DAYS) &&
        (!last || today >= shiftISO(last, REPEAT_AFTER_DAYS)) &&
        recent.has(actionKey(t.action))
      )
    })
    .sort((a, b) => a.end.localeCompare(b.end))
  return due[0] ?? null
}
