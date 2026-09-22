import type { DailyEntry } from '../db/types'

export interface Bucket {
  label: string
  avgPain: number | null
  count: number
}

export interface FactorInsight {
  diffAbs: number
  /** true: pain is higher when the factor is high; false: pain is lower. */
  painHigherWhenFactorHigh: boolean
}

export interface FactorAnalysis {
  key: string
  label: string
  buckets: Bucket[]
  insight: FactorInsight | null
}

type BucketTest = (v: number) => boolean

const FIXED_BUCKET_TESTS: BucketTest[] = [(v) => v <= 3, (v) => v > 3 && v <= 6, (v) => v > 6]

/** Splits values into three roughly equal-sized groups (lowest/mid/highest
 * third of THIS dataset) rather than fixed thresholds. Needed for factors
 * with no natural 0–10 scale (e.g. temperature), where a fixed cutoff would
 * be arbitrary and climate-dependent. */
function tercileBucketTests(values: number[]): BucketTest[] {
  const sorted = [...values].sort((a, b) => a - b)
  const cut1 = sorted[Math.floor(sorted.length / 3) - 1] ?? sorted[0]
  const cut2 = sorted[Math.floor((2 * sorted.length) / 3) - 1] ?? sorted[sorted.length - 1]
  return [(v) => v <= cut1, (v) => v > cut1 && v <= cut2, (v) => v > cut2]
}

/** Buckets a factor into low/mid/high and reports the average pain in each.
 * Kept deliberately simple (plain averages) so the result is something a
 * person can sanity-check, not a black box. `bucketLabels` (low/mid/high)
 * come from the active translation. */
export function analyzeFactor(
  entries: DailyEntry[],
  getValue: (entry: DailyEntry) => number | null | undefined,
  key: string,
  label: string,
  bucketLabels: [string, string, string],
  options?: { positivePhrasing?: boolean; bucketing?: 'fixed' | 'terciles' }
): FactorAnalysis {
  const withValues = entries
    .map((e) => ({ entry: e, value: getValue(e) }))
    .filter((x): x is { entry: DailyEntry; value: number } => typeof x.value === 'number' && typeof x.entry.painLevel === 'number')

  const bucketTests =
    options?.bucketing === 'terciles' ? tercileBucketTests(withValues.map((x) => x.value)) : FIXED_BUCKET_TESTS

  const buckets: Bucket[] = bucketTests.map((test, i) => {
    const matches = withValues.filter((x) => test(x.value))
    const avg = matches.length ? matches.reduce((s, x) => s + x.entry.painLevel, 0) / matches.length : null
    return { label: bucketLabels[i], avgPain: avg, count: matches.length }
  })

  let insight: FactorInsight | null = null
  const low = buckets[0]
  const high = buckets[2]
  if (low.avgPain != null && high.avgPain != null && low.count >= 3 && high.count >= 3) {
    const diff = high.avgPain - low.avgPain
    if (Math.abs(diff) >= 1.2) {
      const worseWhenHigh = diff > 0
      const painHigherWhenFactorHigh = options?.positivePhrasing ? !worseWhenHigh : worseWhenHigh
      insight = { diffAbs: Math.abs(diff), painHigherWhenFactorHigh }
    }
  }

  return { key: key as string, label, buckets, insight }
}

/** Same idea as `analyzeFactor`, but for "did you do this" tags rather than a
 * 0–10 scale: compares average pain on days a tag is present vs absent.
 * Returns one FactorAnalysis per tag with enough data on both sides (>=3
 * days each, same as analyzeFactor's threshold), sorted with the biggest
 * apparent pain reduction first. Like analyzeFactor, this is an association
 * only — a good day also makes someone more likely to go for a walk, not
 * just the other way around. */
export function analyzeTagPresence(
  entries: DailyEntry[],
  getTags: (entry: DailyEntry) => string[] | undefined,
  bucketLabels: [string, string]
): FactorAnalysis[] {
  const withPain = entries.filter((e) => typeof e.painLevel === 'number')
  const allTags = new Set<string>()
  for (const e of withPain) (getTags(e) ?? []).forEach((tag) => allTags.add(tag))

  const results: FactorAnalysis[] = []
  for (const tag of allTags) {
    const withEntries = withPain.filter((e) => (getTags(e) ?? []).includes(tag))
    const withoutEntries = withPain.filter((e) => !(getTags(e) ?? []).includes(tag))
    if (withEntries.length < 3 || withoutEntries.length < 3) continue

    const withAvg = withEntries.reduce((s, e) => s + e.painLevel, 0) / withEntries.length
    const withoutAvg = withoutEntries.reduce((s, e) => s + e.painLevel, 0) / withoutEntries.length
    const diff = withAvg - withoutAvg
    if (Math.abs(diff) < 1.2) continue

    results.push({
      key: tag,
      label: tag,
      buckets: [
        { label: bucketLabels[0], avgPain: withoutAvg, count: withoutEntries.length },
        { label: bucketLabels[1], avgPain: withAvg, count: withEntries.length },
      ],
      insight: { diffAbs: Math.abs(diff), painHigherWhenFactorHigh: diff > 0 },
    })
  }

  return results.sort((a, b) => {
    const aHelps = a.insight ? !a.insight.painHigherWhenFactorHigh : false
    const bHelps = b.insight ? !b.insight.painHigherWhenFactorHigh : false
    if (aHelps !== bHelps) return aHelps ? -1 : 1
    return (b.insight?.diffAbs ?? 0) - (a.insight?.diffAbs ?? 0)
  })
}

/** Returns the Sunday-first weekday indices (matching Date#getDay()) with
 * the lowest / highest average pain — the caller maps these to localized
 * weekday names via the active translation. */
export function bestAndWorstWeekday(entries: DailyEntry[]): { bestIdx: number; worstIdx: number } | null {
  const withDates = entries.filter((e) => typeof e.painLevel === 'number')
  if (withDates.length < 7) return null
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
  return { bestIdx, worstIdx }
}
