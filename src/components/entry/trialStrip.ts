// The strip of a drawn trial (one cell per day) and the one write its cards make: the action added to, or taken from, what helped on a day.
import type { CSSProperties } from 'react'
import { upsertEntry } from '../../hooks/useEntries'
import { actionKey } from '../../lib/leads'
import type { TrialArm } from '../../lib/leadTrial'

export const WITH = 'var(--color-brand)'
export const WITHOUT = 'color-mix(in srgb, var(--color-brand) 30%, transparent)'
export const RESCUE = 'var(--marker)'

/** One day of the strip: done days filled, the days known ahead ringed, the rest still to be drawn. */
export function trialCellStyle(d: { arm?: TrialArm; state: string; revealed?: boolean; rescue?: boolean }): CSSProperties {
  const tone = d.arm === 'with' ? WITH : WITHOUT
  if (d.rescue) return { background: RESCUE }
  if (d.state === 'with' || d.state === 'without') return { background: tone }
  if (d.revealed) return { boxShadow: `inset 0 0 0 2px ${tone}` }
  const faint = 'color-mix(in srgb, var(--color-brand) 22%, transparent)'
  return { boxShadow: `inset 0 0 0 1.5px ${faint}`, background: `repeating-linear-gradient(90deg, transparent 0 3px, ${faint} 3px 5px)` }
}

/** Adds or takes away the action in what helped on a day, keeping the rest of that list as it is. */
export async function setHelped(date: string, current: string[] | undefined, action: string, on: boolean) {
  const list = current ?? []
  const has = list.some((a) => actionKey(a) === actionKey(action))
  if (on === has) return
  await upsertEntry(date, { positiveActions: on ? [...list, action] : list.filter((a) => actionKey(a) !== actionKey(action)) })
}

