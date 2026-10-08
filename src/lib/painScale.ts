// The pain scale shown on a flare day: eleven segments to touch, 0 to 10, and
// a "less" and a "more" to correct by one. The same 0-10 numeric scale as the
// slider, so entries and the report do not change.

export const PAIN_MAX = 10

/** One point more or less. Nothing is chosen until a segment is touched, so
 * there is nothing to step from: no starting value that would anchor the
 * answer on yesterday's. */
export function stepPain(value: number | undefined, delta: -1 | 1): number | undefined {
  if (value === undefined) return undefined
  return Math.min(PAIN_MAX, Math.max(0, value + delta))
}

/** How much of the brand colour a segment takes, from 25 % at 0 to 100 % at
 * 10: a single hue that deepens as pain rises, with no good or bad colour. */
export function segmentStrength(index: number): number {
  return Math.round(25 + (75 * index) / PAIN_MAX)
}
