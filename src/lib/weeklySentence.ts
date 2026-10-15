// "Your week in one sentence", on Sundays: what the three gentlest days of the
// week have in common, when something does and it is rare on the other days.
// Said only when it rests on real days, and never in a flare: a hard stretch
// is not the moment to look for patterns.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { LoggedEntry } from '../db/types'
import { actionKey } from './leads.ts'
import { shiftISO } from './medications.ts'

export type WeeklyFinding = { kind: 'action'; action: string } | { kind: 'sleep' }

/** Days of the week with a pain level before there is a week to speak of. */
export const WEEK_MIN_DAYS = 5
/** A night counts as a good one from this many hours. */
export const GOOD_NIGHT_HOURS = 7
/** The same thing on at most this many of the other days. */
const MAX_ELSEWHERE = 1

export const isSunday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay() === 0

export function weeklyFinding(entries: LoggedEntry[], today: string, flareUnderWay: boolean): WeeklyFinding | null {
  if (!isSunday(today) || flareUnderWay) return null
  const from = shiftISO(today, -6)
  const week = entries.filter((e) => e.date >= from && e.date <= today).sort((a, b) => a.painLevel - b.painLevel)
  if (week.length < WEEK_MIN_DAYS) return null
  const soft = week.slice(0, 3)
  const rest = week.slice(3)
  // A tie at the border would make "the three gentlest" a matter of luck. With
  // whole numbers, a strict gap there also puts them a full point under the rest.
  if (soft[2].painLevel === rest[0].painLevel) return null

  const actionsOf = (e: LoggedEntry) => new Set((e.positiveActions ?? []).map(actionKey).filter(Boolean))
  const shown = new Map<string, string>()
  for (const e of soft) for (const a of e.positiveActions ?? []) if (actionKey(a)) shown.set(actionKey(a), a.trim())
  const common = [...shown.keys()]
    .filter((k) => soft.every((e) => actionsOf(e).has(k)))
    .map((k) => ({ k, elsewhere: rest.filter((e) => actionsOf(e).has(k)).length }))
    .filter((c) => c.elsewhere <= MAX_ELSEWHERE)
    .sort((a, b) => a.elsewhere - b.elsewhere)
  if (common.length) return { kind: 'action', action: shown.get(common[0].k)! }

  const slept = (e: LoggedEntry) => typeof e.sleepHours === 'number' && e.sleepHours >= GOOD_NIGHT_HOURS
  if (soft.every(slept) && rest.filter(slept).length <= MAX_ELSEWHERE) return { kind: 'sleep' }
  return null
}
