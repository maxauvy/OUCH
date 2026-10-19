// What brings a lead to the person without them opening Trends: a card on the
// day's page once, a dot on the Trends tab, and the Sunday sentence. Each is
// switchable, and each is quiet during a flare. What was already shown is kept
// per device, like the other "seen" markers: it says nothing about the diary.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import { actionKey, type Lead, type LeadChoices } from './leads.ts'
import type { LeadTrial } from './leadTrial.ts'
import { shiftISO } from './medications.ts'

export interface LeadsSeen {
  /** Leads already brought to the day's page: each comes once. */
  prompted: string[]
  /** The one on show today: it stays until it is closed, or the day ends. */
  today?: { date: string; key: string; dismissed: boolean }
  /** The leads on Trends's card when it was last opened: the dot shows what is not among them. */
  trends: string[]
  /** The Sunday the sentence was shown, and whether it was closed. */
  weekly?: { date: string; dismissed: boolean }
  /** Trials the person said "not now" to. */
  declined: string[]
  /** The trial to do again on show today: it stays until it is closed, or the day ends. */
  repeat?: { date: string; key: string; dismissed: boolean }
  /** When each trial was last offered again, by lead key: the next offer waits. */
  repeatShown?: Record<string, string>
}

export const NO_LEADS_SEEN: LeadsSeen = { prompted: [], trends: [], declined: [] }
const MAX_KEYS = 60

/** `keys` with `add` after them, without repeats, the oldest dropped past a cap. */
export function remember(keys: string[], add: string[]): string[] {
  return [...new Set([...keys, ...add])].slice(-MAX_KEYS)
}

/** The lead to bring to the day's page, if any: one the person has not answered
 * and has not been shown before, once their pain is logged, outside a flare,
 * and that is not the subject of a trial.
 * The one shown today stays until it is closed. */
export function leadToBring(input: {
  shown: Lead[]
  choices: LeadChoices | undefined
  seen: LeadsSeen | undefined
  today: string
  enabled: boolean
  /** A flare is under way, or the day's pain is not logged yet */
  quiet: boolean
  /** Leads already under trial, now or before: the trial says more than a sentence on the notes would. */
  tried?: string[]
}): Lead | null {
  const { shown, choices, seen, today, enabled, quiet, tried = [] } = input
  if (!enabled || quiet) return null
  const open = shown.filter((l) => !tried.includes(l.key))
  if (seen?.today?.date === today) {
    if (seen.today.dismissed) return null
    return open.find((l) => l.key === seen.today!.key) ?? null
  }
  return open.find((l) => !choices?.[l.key] && !seen?.prompted.includes(l.key)) ?? null
}

/** The dot on the Trends tab: a lead on its card that it has not shown yet. */
export function trendsDot(input: { shown: Lead[]; seen: LeadsSeen | undefined; enabled: boolean }): boolean {
  const { shown, seen, enabled } = input
  return enabled && shown.some((l) => !seen?.trends.includes(l.key))
}

/** Whether the Sunday sentence is on show: not closed, and shown at most that day. */
export function weeklyVisible(seen: LeadsSeen | undefined, today: string): boolean {
  return !(seen?.weekly?.date === today && seen.weekly.dismissed)
}

/** A trial is offered again this long after it ended, and no sooner than this after the last offer. */
export const REPEAT_AFTER_DAYS = 56
/** Only for an action still in the notes: noted at least once in the last days. */
export const REPEAT_RECENT_DAYS = 28

/** The trial to offer again on the day's page, if any: one closed at least
 * eight weeks ago, whose action is still part of the person's days, outside a
 * flare and with no trial under way. One at a time; the one shown today stays
 * until it is closed. Doing something over a long time, not once, is the point. */
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
  if (seen?.repeat?.date === today) {
    return seen.repeat.dismissed ? null : (latest.get(seen.repeat.key) ?? null)
  }
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
