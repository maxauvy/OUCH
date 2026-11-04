// The direction a figure took since the period before, for the arrow beside it
// on the report: up, down or flat, and whether that is the way things get
// better. Only a direction: it says nothing of how much (the figure and the
// period before are written beside it) nor whether the change is more than
// the patient's usual variation (the report says that elsewhere).

export type TrendDirection = 'up' | 'down' | 'flat'
export type TrendTone = 'better' | 'worse' | 'same'

export interface Trend {
  direction: TrendDirection
  tone: TrendTone
}

/** Smallest change that counts as one, by kind of figure: below it the arrow is flat. */
export const FLAT_BELOW = {
  /** A score or a mean on the 0–10 scales. */
  score: 0.2,
  /** A share of days (0 to 1): three points. */
  share: 0.03,
  /** Hours of sleep. */
  hours: 0.25,
} as const

/** `better` says which way is the good one: a lower pain, a longer sleep. */
export function trend(current: number, previous: number, better: 'lower' | 'higher', flatBelow: number): Trend {
  const delta = current - previous
  if (!Number.isFinite(delta) || Math.abs(delta) < flatBelow) return { direction: 'flat', tone: 'same' }
  const direction: TrendDirection = delta > 0 ? 'up' : 'down'
  const good = (direction === 'down') === (better === 'lower')
  return { direction, tone: good ? 'better' : 'worse' }
}
