// The breathing exercise of "Un moment pour souffler": slow breaths, the out
// breath longer than the in breath, for a few minutes the person can cut short.
// Pure (no React, no timers of its own), so the rhythm can be tested with plain Node.
// The rhythm is a common one for slow breathing, not a treatment: the app
// promises a pause, nothing about the pain.

/** Seconds to breathe in, then out. */
export const IN_SECONDS = 4
export const OUT_SECONDS = 6
/** The exercise ends by itself after this long, to choose among `DURATIONS`. */
export const SESSION_SECONDS = 180
export const DURATIONS = [60, 180, 300] as const
export type Duration = (typeof DURATIONS)[number]

/** The pattern of the vibrator for each change, in milliseconds: one short pulse to breathe in, two to breathe out. */
export const VIBRATION: Record<'in' | 'out', number[]> = { in: [40], out: [40, 120, 40] }

export type BreathPhase = 'in' | 'out'
export interface Breath {
  phase: BreathPhase
  /** Seconds left in this phase, rounded up: what the circle counts. */
  left: number
  /** Breaths completed so far. */
  breaths: number
  done: boolean
}

/** Where the exercise is after `ms` milliseconds, for a session of `total` seconds. */
export function breathAt(ms: number, total: number = SESSION_SECONDS): Breath {
  const cycle = IN_SECONDS + OUT_SECONDS
  const s = Math.max(0, ms) / 1000
  if (s >= total) return { phase: 'out', left: 0, breaths: Math.floor(total / cycle), done: true }
  const within = s % cycle
  const phase: BreathPhase = within < IN_SECONDS ? 'in' : 'out'
  const left = Math.ceil(phase === 'in' ? IN_SECONDS - within : cycle - within)
  return { phase, left, breaths: Math.floor(s / cycle), done: false }
}
