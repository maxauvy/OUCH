// What brings a lead to the person without them opening Trends: the list on the
// day's page (see todayMessages.ts) and a dot on the Trends tab. Each is
// switchable, and each is quiet during a flare. What was already shown is kept
// per device, like the other "seen" markers: it says nothing about the diary.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { Lead } from './leads.ts'
import type { MessageLaterMap } from './todayMessages.ts'

export interface LeadsSeen {
  /** The leads on Trends's card when it was last opened: the dot shows what is not among them. */
  trends: string[]
  /** Trials the person said "not now" to. */
  declined: string[]
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

