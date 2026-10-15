// What brings a lead to the person without them opening Trends: a card on the
// day's page once, a dot on the Trends tab, and the Sunday sentence. Each is
// switchable, and each is quiet during a flare. What was already shown is kept
// per device, like the other "seen" markers: it says nothing about the diary.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { Lead, LeadChoices } from './leads.ts'

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
}

export const NO_LEADS_SEEN: LeadsSeen = { prompted: [], trends: [], declined: [] }
const MAX_KEYS = 60

/** `keys` with `add` after them, without repeats, the oldest dropped past a cap. */
export function remember(keys: string[], add: string[]): string[] {
  return [...new Set([...keys, ...add])].slice(-MAX_KEYS)
}

/** The lead to bring to the day's page, if any: one the person has not answered
 * and has not been shown before, once their pain is logged, outside a flare.
 * The one shown today stays until it is closed. */
export function leadToBring(input: {
  shown: Lead[]
  choices: LeadChoices | undefined
  seen: LeadsSeen | undefined
  today: string
  enabled: boolean
  /** A flare is under way, or the day's pain is not logged yet */
  quiet: boolean
}): Lead | null {
  const { shown, choices, seen, today, enabled, quiet } = input
  if (!enabled || quiet) return null
  if (seen?.today?.date === today) {
    if (seen.today.dismissed) return null
    return shown.find((l) => l.key === seen.today!.key) ?? null
  }
  return shown.find((l) => !choices?.[l.key] && !seen?.prompted.includes(l.key)) ?? null
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
