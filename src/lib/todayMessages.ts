// What waits for the person on the day's page, as one list: the quiet line under
// the title says how many things wait, and the sheet it opens lists them. Pure
// (no React, no Dexie), so the rules can be tested with plain Node.
//
// The rules:
// - A hard day (a flare under way) has no list at all: the soft word of the
//   hard days stands alone, and nothing else is asked.
// - Opening the sheet consumes nothing. A message leaves the list when the
//   person acts on it, or says "later": it is then away for 7 days, and the
//   second "later" is the last, it does not come back on the day's page (a lead
//   stays in Trends, an invitation in Settings).
// - A trial under way is a state, not a message: it is in the sheet, it is not
//   counted, and a list with only a trial has its own line ("a trial is under way"),
//   so the card is never out of reach.
// - The reminder to back up is not part of it: it keeps its own card.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { FlareEpisode } from './flares.ts'
import type { Lead, LeadChoices } from './leads.ts'
import type { LeadTrial } from './leadTrial.ts'
import type { WeeklyFinding } from './weeklySentence.ts'
import { daysBetween, shiftISO } from './dates.ts'

/** A flare is still worth a word of recognition this many days after its last day. */
export const CALM_DAYS = 7

/** How long a message set aside stays away. */
export const LATER_DAYS = 7
/** The second "later" is the last. */
export const LATER_MAX = 2
const MAX_KEYS = 60

/** What was answered to a message: set aside for a while, or done. By message key. */
export interface MessageLater {
  /** Away until this day (ISO); the day itself it is back. */
  until?: string
  /** How many times "later" was said. */
  count: number
  /** Acted on: it does not come back. */
  done?: boolean
}
export type MessageLaterMap = Record<string, MessageLater>

export type TodayMessage =
  | { kind: 'weekly'; key: string; finding: WeeklyFinding }
  | { kind: 'lead'; key: string; lead: Lead }
  | { kind: 'repeat'; key: string; trial: LeadTrial }
  | { kind: 'invite'; key: 'invite' }
  | { kind: 'calm'; key: string; episode: FlareEpisode }
  | { kind: 'trial'; key: 'trial'; trial: LeadTrial }

export interface TodayMessages {
  /** In the order the sheet lists them. */
  items: TodayMessage[]
  /** What the line counts: the things that wait for an answer. A trial under way is not one. */
  count: number
}

export interface TodayMessagesInput {
  today: string
  /** A flare is under way: nothing is brought. */
  quiet: boolean
  later: MessageLaterMap | undefined
  /** Which suggestions the person lets through. */
  allow: { leads: boolean; weekly: boolean; trials: boolean; calm: boolean }
  /** The leads Trends shows by default (`LeadList.shown`). */
  leads: Lead[]
  leadChoices: LeadChoices | undefined
  /** Leads under trial, now or before: the trial says more than a sentence on the notes. */
  tried: string[]
  /** The Sunday sentence, if there is one this Sunday. */
  weekly: WeeklyFinding | null
  /** A past trial due to be offered again (`trialToRepeat`). */
  repeat: LeadTrial | null
  /** The invitation to follow new indicators shows today (`shouldShowInvite`). */
  invite: boolean
  /** A flare that just ended and whose way back to the usual level is known (`recentReturn`). */
  calm: FlareEpisode | null
  /** The trial under way, or just over and waiting to be closed. */
  trial: LeadTrial | undefined
}

/** Whether a message is away today: acted on, set aside for now, or set aside for the last time. */
export function isAway(later: MessageLater | undefined, today: string): boolean {
  if (!later) return false
  if (later.done || later.count >= LATER_MAX) return true
  return later.until !== undefined && today < later.until
}

/** The last flare that is over, when it ended within `CALM_DAYS` and the pain came back to the usual level at least a day later. */
export function recentReturn(episodes: readonly FlareEpisode[], today: string): FlareEpisode | null {
  const over = episodes.filter((e) => !e.ongoing && !e.endUnknown && (e.recoveryDays ?? 0) >= 1 && daysBetween(e.end, today) <= CALM_DAYS)
  return over.at(-1) ?? null
}

export function todayMessages(input: TodayMessagesInput): TodayMessages {
  const { today, quiet, later, allow, leads, leadChoices, tried, weekly, repeat, invite, calm, trial } = input
  if (quiet) return { items: [], count: 0 }
  const waiting = (key: string) => !isAway(later?.[key], today)

  const items: TodayMessage[] = []
  if (allow.weekly && weekly && waiting(`weekly:${today}`)) items.push({ kind: 'weekly', key: `weekly:${today}`, finding: weekly })
  if (allow.leads) {
    for (const lead of leads) {
      const key = `lead:${lead.key}`
      if (!leadChoices?.[lead.key] && !tried.includes(lead.key) && waiting(key)) items.push({ kind: 'lead', key, lead })
    }
  }
  // Keyed by the trial it follows: after the next week done, the offer is a new one.
  const repeatKey = repeat ? `repeat:${repeat.key}:${repeat.end}` : ''
  if (allow.trials && repeat && waiting(repeatKey)) items.push({ kind: 'repeat', key: repeatKey, trial: repeat })
  if (invite) items.push({ kind: 'invite', key: 'invite' })
  const calmKey = calm ? `calm:${calm.start}` : ''
  if (allow.calm && calm && waiting(calmKey)) items.push({ kind: 'calm', key: calmKey, episode: calm })

  const count = items.length
  if (trial) items.push({ kind: 'trial', key: 'trial', trial })
  return { items, count }
}

/** Keeps the map from growing for ever: the most recent keys stay. */
function capped(map: MessageLaterMap): MessageLaterMap {
  const entries = Object.entries(map)
  return entries.length <= MAX_KEYS ? map : Object.fromEntries(entries.slice(-MAX_KEYS))
}

/** "Later": away for `LATER_DAYS`; the second time, for good. */
export function postpone(later: MessageLaterMap | undefined, key: string, today: string): MessageLaterMap {
  const { [key]: previous, ...others } = later ?? {}
  const count = (previous?.count ?? 0) + 1
  return capped({ ...others, [key]: { count, until: count >= LATER_MAX ? undefined : shiftISO(today, LATER_DAYS) } })
}

/** The person acted on it: it does not come back. */
export function markDone(later: MessageLaterMap | undefined, key: string): MessageLaterMap {
  const { [key]: previous, ...others } = later ?? {}
  return capped({ ...others, [key]: { count: previous?.count ?? 0, done: true } })
}
