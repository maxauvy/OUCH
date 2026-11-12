// "Mes gestes": the few things the person does to feel a little better, each
// with the time they chose for it. Built from what they already note under
// "what helped" (the ones noted most come first), and from what they add. OUCH
// recommends no time: the default is a starting point they change, not advice.
//
// Imports carry a `.ts` extension so this file can be tested with plain Node.

import type { DailyEntry, ReliefGesture } from '../db/types.ts'
import { shiftISO } from './dates.ts'

export const MAX_GESTURES = 5
export const MAX_NAME = 60
export const DEFAULT_MINUTES = 10
export const MIN_MINUTES = 5
export const MAX_MINUTES = 120
export const STEP_MINUTES = 5
/** The diary is read over this many days for what was noted. */
export const WINDOW_DAYS = 90
/** An action noted on fewer days is probably a slip of the keyboard, not a habit. */
export const MIN_DAYS = 2

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase()
const clampMinutes = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n))) : DEFAULT_MINUTES

/** The gestures kept, tidied: clean names, no repeat (case aside), a few at most, a time between the limits. */
export function cleanGestures(raw: unknown): ReliefGesture[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: ReliefGesture[] = []
  for (const r of raw) {
    const name = typeof (r as ReliefGesture)?.name === 'string' ? oneLine((r as ReliefGesture).name) : ''
    if (name && !out.some((g) => same(g.name, name))) out.push({ name, minutes: clampMinutes((r as ReliefGesture).minutes) })
  }
  const kept = out.slice(0, MAX_GESTURES)
  return kept.length ? kept : undefined
}

export interface NotedAction {
  label: string
  /** Days it was noted on, in the window. */
  days: number
}

/** What the person noted as having helped, on how many of the last 90 days: the most often first. */
export function notedActions(entries: readonly DailyEntry[], today: string, max = 8): NotedAction[] {
  const from = shiftISO(today, -WINDOW_DAYS)
  const counts = new Map<string, NotedAction>()
  for (const e of entries) {
    if (e.date < from || e.date > today) continue
    for (const raw of new Set((e.positiveActions ?? []).map(oneLine).filter(Boolean))) {
      const key = raw.toLocaleLowerCase()
      const cur = counts.get(key)
      counts.set(key, { label: cur?.label ?? raw, days: (cur?.days ?? 0) + 1 })
    }
  }
  return [...counts.values()]
    .filter((c) => c.days >= MIN_DAYS)
    .sort((a, b) => b.days - a.days || a.label.localeCompare(b.label))
    .slice(0, max)
}

export interface GestureRow {
  name: string
  /** Days noted, when it was noted at all. */
  days?: number
  /** Set when kept: the time chosen. */
  minutes?: number
}

/** The rows of the page: the gestures kept first, then what was noted and not kept. */
export function gestureRows(kept: readonly ReliefGesture[], noted: readonly NotedAction[]): GestureRow[] {
  const rows: GestureRow[] = kept.map((g) => ({ name: g.name, minutes: g.minutes, days: noted.find((n) => same(n.label, g.name))?.days }))
  for (const n of noted) if (!kept.some((g) => same(g.name, n.label))) rows.push({ name: n.label, days: n.days })
  return rows
}

export const isKept = (kept: readonly ReliefGesture[], name: string) => kept.some((g) => same(g.name, name))

/** Keeps or lets go of a gesture. Keeping a sixth does nothing: the list is short on purpose. */
export function toggleGesture(kept: readonly ReliefGesture[], name: string): ReliefGesture[] {
  const clean = oneLine(name)
  if (!clean) return [...kept]
  if (isKept(kept, clean)) return kept.filter((g) => !same(g.name, clean))
  return kept.length >= MAX_GESTURES ? [...kept] : [...kept, { name: clean, minutes: DEFAULT_MINUTES }]
}

/** One more or one less step of time, within the limits. */
export function stepMinutes(kept: readonly ReliefGesture[], name: string, direction: 1 | -1): ReliefGesture[] {
  return kept.map((g) => (same(g.name, name) ? { ...g, minutes: clampMinutes(g.minutes + direction * STEP_MINUTES) } : g))
}

/** How far a timer has come: time left, the share done, and whether it is over. */
export function timerState(startedAt: number, now: number, minutes: number): { leftMs: number; fraction: number; done: boolean } {
  const total = minutes * 60_000
  const spent = Math.max(0, now - startedAt)
  return { leftMs: Math.max(0, total - spent), fraction: Math.min(1, spent / total), done: spent >= total }
}
