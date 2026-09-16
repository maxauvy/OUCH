import type { DailyEntry } from '../db/types'

export interface Bucket {
  label: string
  avgPain: number | null
  count: number
}

export interface FactorAnalysis {
  key: string
  label: string
  buckets: Bucket[]
  insight: string | null
}

const BUCKET_DEFS = [
  { label: 'Faible', test: (v: number) => v <= 3 },
  { label: 'Moyen', test: (v: number) => v > 3 && v <= 6 },
  { label: 'Élevé', test: (v: number) => v > 6 },
]

/** Buckets a 0–10 factor into low/mid/high and reports the average pain in
 * each. Kept deliberately simple (tercile-ish buckets, plain averages) so
 * the result is something a person can sanity-check, not a black box. */
export function analyzeFactor(
  entries: DailyEntry[],
  key: keyof DailyEntry,
  label: string,
  options?: { positivePhrasing?: boolean }
): FactorAnalysis {
  const withValues = entries.filter((e) => typeof e[key] === 'number' && typeof e.painLevel === 'number')

  const buckets: Bucket[] = BUCKET_DEFS.map((def) => {
    const matches = withValues.filter((e) => def.test(e[key] as number))
    const avg = matches.length ? matches.reduce((s, e) => s + e.painLevel, 0) / matches.length : null
    return { label: def.label, avgPain: avg, count: matches.length }
  })

  let insight: string | null = null
  const low = buckets[0]
  const high = buckets[2]
  if (low.avgPain != null && high.avgPain != null && low.count >= 3 && high.count >= 3) {
    const diff = high.avgPain - low.avgPain
    if (Math.abs(diff) >= 1.2) {
      const worseWhenHigh = diff > 0
      const direction = options?.positivePhrasing ? !worseWhenHigh : worseWhenHigh
      insight = direction
        ? `Quand ${label.toLowerCase()} est élevé, ta douleur moyenne est ${Math.abs(diff).toFixed(1)} point${Math.abs(diff) >= 2 ? 's' : ''} plus haute.`
        : `Quand ${label.toLowerCase()} est élevé, ta douleur moyenne est ${Math.abs(diff).toFixed(1)} point${Math.abs(diff) >= 2 ? 's' : ''} plus basse.`
    }
  }

  return { key: key as string, label, buckets, insight }
}

export function bestAndWorstWeekday(entries: DailyEntry[]): { best: string; worst: string } | null {
  const withDates = entries.filter((e) => typeof e.painLevel === 'number')
  if (withDates.length < 7) return null
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const sums = Array(7).fill(0)
  const counts = Array(7).fill(0)
  for (const e of withDates) {
    const day = new Date(e.date + 'T00:00:00').getDay()
    sums[day] += e.painLevel
    counts[day]++
  }
  const avgs = sums.map((s, i) => (counts[i] ? s / counts[i] : null))
  let bestIdx = -1
  let worstIdx = -1
  avgs.forEach((v, i) => {
    if (v == null || counts[i] < 2) return
    if (bestIdx === -1 || v < avgs[bestIdx]!) bestIdx = i
    if (worstIdx === -1 || v > avgs[worstIdx]!) worstIdx = i
  })
  if (bestIdx === -1 || worstIdx === -1 || bestIdx === worstIdx) return null
  return { best: dayNames[bestIdx], worst: dayNames[worstIdx] }
}
