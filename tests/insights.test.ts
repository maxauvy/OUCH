// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { analyzeFactor, analyzeTagPresence, bestAndWorstWeekday } from '../src/lib/insights.ts'
import { shiftISO } from '../src/lib/medications.ts'

const day = (n: number) => shiftISO('2026-09-14', n) // 2026-09-14 is a Monday
const entry = (n: number, painLevel: number, extra: Partial<DailyEntry> = {}): DailyEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})
const near = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`)

const LABELS: [string, string, string] = ['low', 'mid', 'high']
const sleep = (entries: DailyEntry[], options?: { bucketing?: 'fixed' | 'terciles' }) =>
  analyzeFactor(entries, (e) => e.sleepQuality, 'sleep', 'Sleep', LABELS, options)

test('better sleep with less pain is reported as pain lower when the factor is high', () => {
  const result = sleep([
    ...[8, 8, 9].map((p, i) => entry(i, p, { sleepQuality: 2 })),
    ...[2, 3, 2].map((p, i) => entry(3 + i, p, { sleepQuality: 8 })),
  ])
  assert.deepEqual(result.buckets.map((b) => b.count), [3, 0, 3])
  near(result.buckets[0].avgPain, 25 / 3)
  assert.equal(result.buckets[1].avgPain, null)
  near(result.buckets[2].avgPain, 7 / 3)
  assert.ok(result.insight)
  assert.equal(result.insight.painHigherWhenFactorHigh, false)
  near(result.insight.diffAbs, 6)
})

test('more pain when the factor is high is reported the other way round', () => {
  const result = analyzeFactor(
    [
      ...[2, 2, 3].map((p, i) => entry(i, p, { stressLevel: 1 })),
      ...[7, 8, 8].map((p, i) => entry(3 + i, p, { stressLevel: 9 })),
    ],
    (e) => e.stressLevel,
    'stress',
    'Stress',
    LABELS
  )
  assert.equal(result.insight?.painHigherWhenFactorHigh, true)
})

test('the buckets follow the fixed 0-3 / 4-6 / 7-10 split', () => {
  const values = [0, 3, 3.5, 4, 6, 6.5, 7, 10]
  const result = sleep(values.map((v, i) => entry(i, 5, { sleepQuality: v })))
  assert.deepEqual(result.buckets.map((b) => b.count), [2, 3, 3])
})

test('no insight without three days on each side, or for a small difference', () => {
  const two = sleep([
    ...[8, 8].map((p, i) => entry(i, p, { sleepQuality: 2 })),
    ...[2, 3, 2].map((p, i) => entry(2 + i, p, { sleepQuality: 8 })),
  ])
  assert.equal(two.insight, null)

  const small = sleep([
    ...[4, 4, 4].map((p, i) => entry(i, p, { sleepQuality: 2 })),
    ...[5, 5, 5].map((p, i) => entry(3 + i, p, { sleepQuality: 8 })),
  ])
  assert.equal(small.insight, null)

  const enough = sleep([
    ...[4, 4, 4].map((p, i) => entry(i, p, { sleepQuality: 2 })),
    ...[6, 5, 5].map((p, i) => entry(3 + i, p, { sleepQuality: 8 })),
  ])
  assert.ok(enough.insight)
})

test('days without a value for the factor are left out', () => {
  const result = sleep([entry(0, 9), entry(1, 9, { sleepQuality: 2 }), entry(2, 1, { sleepQuality: 8 })])
  assert.deepEqual(result.buckets.map((b) => b.count), [1, 0, 1])
})

test('terciles split the values of the dataset in three equal parts', () => {
  const result = sleep(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((v, i) => entry(i, v, { sleepQuality: v })),
    { bucketing: 'terciles' }
  )
  assert.deepEqual(result.buckets.map((b) => b.count), [3, 3, 3])
  near(result.buckets[0].avgPain, 2)
  near(result.buckets[2].avgPain, 8)
})

// Twelve days: three with a walk (pain 2), three with alcohol (pain 9), six
// with neither (pain 5).
const tagged = () => [
  ...[0, 1, 2].map((i) => entry(i, 2, { positiveActions: ['marche'] })),
  ...[3, 4, 5].map((i) => entry(i, 9, { positiveActions: ['alcool'] })),
  ...[6, 7, 8, 9, 10, 11].map((i) => entry(i, 5)),
]

test('a tag is compared with the days without it', () => {
  const [marche] = analyzeTagPresence(tagged(), (e) => e.positiveActions, ['without', 'with'])
  assert.equal(marche.key, 'marche')
  assert.deepEqual(marche.buckets.map((b) => b.label), ['without', 'with'])
  assert.deepEqual(marche.buckets.map((b) => b.count), [9, 3])
  near(marche.buckets[0].avgPain, 19 / 3)
  near(marche.buckets[1].avgPain, 2)
  assert.equal(marche.insight?.painHigherWhenFactorHigh, false)
})

test('what seems to help comes first, even if another tag has a larger gap', () => {
  const results = analyzeTagPresence(tagged(), (e) => e.positiveActions, ['without', 'with'])
  assert.deepEqual(results.map((r) => r.key), ['marche', 'alcool'])
  assert.ok(results[1].insight!.diffAbs > results[0].insight!.diffAbs)
})

test('a tag seen on fewer than three days is not analysed', () => {
  const entries = [...tagged(), entry(12, 1, { positiveActions: ['rare'] }), entry(13, 1, { positiveActions: ['rare'] })]
  const keys = analyzeTagPresence(entries, (e) => e.positiveActions, ['a', 'b']).map((r) => r.key)
  assert.ok(!keys.includes('rare'))
})

test('the best and worst weekdays are indices from Sunday (0) to Saturday (6)', () => {
  // Two weeks from Monday 14 September: Mondays at 9, Sundays at 1, others 5.
  const entries = Array.from({ length: 14 }, (_, i) => entry(i, i % 7 === 0 ? 9 : i % 7 === 6 ? 1 : 5))
  assert.deepEqual(bestAndWorstWeekday(entries), { bestIdx: 0, worstIdx: 1 })
})

test('weekdays are not ranked with less than a week of data, or when all are alike', () => {
  assert.equal(bestAndWorstWeekday(Array.from({ length: 6 }, (_, i) => entry(i, i))), null)
  assert.equal(bestAndWorstWeekday(Array.from({ length: 14 }, (_, i) => entry(i, 5))), null)
})
