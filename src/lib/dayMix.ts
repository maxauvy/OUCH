// The days of a period by intensity (mild, moderate, severe), set against the period before: for each class its share, the share before and the
// gap in percentage points, and which way that gap goes (better, worse, flat; the moderate days have no "better" side).
// Pure (no React), so it can be tested with plain Node.

export interface DayShares {
  mild: number
  moderate: number
  severe: number
}

export type MixKey = keyof DayShares
export type MixDirection = 'better' | 'worse' | 'flat' | 'neutral'

export interface MixRow {
  key: MixKey
  /** Share of the period's days, 0 to 1. */
  share: number
  /** Share of the previous period's days; absent when there is none to compare with. */
  prev?: number
  /** Gap in percentage points, between the two shares as they are written (rounded to the percent): "34 % against 25 %" is +9. */
  points?: number
  direction?: MixDirection
}

const KEYS: MixKey[] = ['mild', 'moderate', 'severe']

/** More mild days and fewer severe ones are the way things get better; the moderate days are a middle ground that says nothing alone. */
function directionOf(key: MixKey, points: number): MixDirection {
  if (points === 0) return 'flat'
  if (key === 'moderate') return 'neutral'
  return (key === 'mild') === points > 0 ? 'better' : 'worse'
}

export function dayMix(current: DayShares, previous?: DayShares | null): MixRow[] {
  return KEYS.map((key) => {
    const share = current[key]
    if (!previous) return { key, share }
    const prev = previous[key]
    const points = Math.round(share * 100) - Math.round(prev * 100)
    return { key, share, prev, points, direction: directionOf(key, points) }
  })
}
