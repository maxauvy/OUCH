// "Mon plan des jours difficiles": a few lines the person writes in a calm
// moment, for a hard day. Four free fields, nothing guessed, nothing computed,
// nothing sent. A restored copy goes through the same cleaning as a typed one.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { HardDaysPlan } from '../db/types.ts'

export const PLAN_FIELDS = ['allow', 'helps', 'who', 'remember'] as const
export type PlanField = (typeof PLAN_FIELDS)[number]
export const MAX_PLAN = 280

const clean = (s: unknown): string => (typeof s === 'string' ? s.trim().replace(/\r\n/g, '\n').slice(0, MAX_PLAN) : '')

/** What the person typed, tidied; undefined when nothing is left, so an empty form leaves no trace. */
export function cleanPlan(input: Partial<Record<PlanField, unknown>> | null | undefined): HardDaysPlan | undefined {
  if (!input) return undefined
  const out: HardDaysPlan = {}
  for (const f of PLAN_FIELDS) {
    const v = clean(input[f])
    if (v) out[f] = v
  }
  return Object.keys(out).length ? out : undefined
}

/** A plan read from a backup: anything that is not an object of strings is dropped. */
export function planFromBackup(raw: unknown): HardDaysPlan | undefined {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? cleanPlan(raw as Record<string, unknown>) : undefined
}

export const hasPlan = (plan: HardDaysPlan | undefined): plan is HardDaysPlan => !!plan && PLAN_FIELDS.some((f) => !!plan[f])

/** The first line of the plan, for a card that only hints at it. */
export function planGlimpse(plan: HardDaysPlan | undefined, max = 60): string {
  if (!plan) return ''
  const first = PLAN_FIELDS.map((f) => plan[f]).find(Boolean) ?? ''
  const line = first.split('\n')[0]!.trim()
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line
}
