// The gesture that turns early access on or off: five taps in a row, close
// together, on the credit line at the foot of a page. Kept apart from the
// storage so that it can be tested.

export const TAPS_NEEDED = 5
/** Taps this far apart (ms) or less count as a row. */
export const TAP_GAP_MS = 1500

export interface TapRun {
  count: number
  lastAt: number
}

/** The run after a tap at `now`, and whether this tap completes it (the run then starts over). */
export function registerTap(run: TapRun | null, now: number): { run: TapRun; done: boolean } {
  const count = run && now - run.lastAt <= TAP_GAP_MS ? run.count + 1 : 1
  return count >= TAPS_NEEDED ? { run: { count: 0, lastAt: now }, done: true } : { run: { count, lastAt: now }, done: false }
}
