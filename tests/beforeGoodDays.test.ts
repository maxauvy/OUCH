// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import { MIN_GOOD_ROWS, beforeGoodDays, goodDayCeiling, goodDayHint, goodDaySet, goodRowStarts } from '../src/lib/beforeGoodDays.ts'
import { shiftISO } from '../src/lib/dates.ts'

const START = '2026-01-01'
const day = (n: number) => shiftISO(START, n)
const NONE = new Set<string>()

interface Shape {
  length?: number
  /** Days (offsets) on which a good day falls, pain 2 against a usual 5 */
  good: number[]
  /** Sleep the night before a good day (noted on its morning); 7 h otherwise */
  sleepBefore?: number
  /** Stress the day before a good day; 4 otherwise */
  stressBefore?: number
}

function diary(shape: Shape): LoggedEntry[] {
  const length = shape.length ?? 300
  const good = new Set(shape.good)
  return Array.from({ length }, (_, n) => ({
    date: day(n),
    painLevel: good.has(n) ? 2 : 5,
    sleepHours: good.has(n) && shape.sleepBefore !== undefined ? shape.sleepBefore : 7,
    stressLevel: good.has(n + 1) && shape.stressBefore !== undefined ? shape.stressBefore : 4,
    createdAt: 0,
    updatedAt: 0,
  }))
}
const GOOD = Array.from({ length: 12 }, (_, i) => 40 + i * 20)

test('a good day is relative to the usual pain', () => {
  assert.equal(goodDayCeiling(5), 3.5)
  assert.equal(goodDayCeiling(8), 6)
  assert.equal(goodDayCeiling(2), 0.5)
  const good = goodDaySet(diary({ good: GOOD }), NONE)
  assert.deepEqual([...good].sort(), GOOD.map(day))
})

test('the first days of the diary cannot be good days: the usual needs ten logged days', () => {
  assert.equal(goodDaySet(diary({ good: [3, 40] }), NONE).has(day(3)), false)
})

test('a row of good days counts once, by its first day', () => {
  const good = goodDaySet(diary({ good: [40, 41, 42, 60] }), NONE)
  assert.deepEqual(goodRowStarts(good), [day(40), day(60)])
})

test('flare days are neither good days nor part of the usual', () => {
  const flare = new Set([day(40)])
  assert.equal(goodDaySet(diary({ good: [40] }), flare).has(day(40)), false)
})

test('under eight rows of good days nothing is said', () => {
  assert.equal(MIN_GOOD_ROWS, 8)
  assert.equal(beforeGoodDays(diary({ good: GOOD.slice(0, 7), sleepBefore: 9 }), NONE), null)
  assert.notEqual(beforeGoodDays(diary({ good: GOOD.slice(0, 8), sleepBefore: 9 }), NONE), null)
})

test('a longer night before every good day stands out, the rest does not', () => {
  const r = beforeGoodDays(diary({ good: GOOD, sleepBefore: 9 }), NONE)!
  const sleep = r.lines.find((l) => l.key === 'sleepHours')!
  assert.equal(sleep.observed, GOOD.length)
  assert.equal(sleep.verdict, 'above')
  assert.deepEqual(
    r.above.map((l) => l.key),
    ['sleepHours']
  )
  assert.equal(r.lines.find((l) => l.key === 'stressLevel')!.verdict, 'within')
})

test('the stress is read on the day before, not on the good day', () => {
  const r = beforeGoodDays(diary({ good: GOOD, stressBefore: 1 }), NONE)!
  assert.deepEqual(
    r.above.map((l) => l.key),
    ['stressLevel']
  )
})

test('nothing stands out when the eves are like any other day', () => {
  const r = beforeGoodDays(diary({ good: GOOD }), NONE)!
  assert.equal(r.above.length, 0)
  assert.equal(r.rows, GOOD.length)
})

test('the hint on the day page: only on the first good day of a row, with what stands out before', () => {
  const next = 40 + GOOD.length * 20
  const entries = diary({ good: [...GOOD, next, next + 1], sleepBefore: 9, length: next + 2 })
  assert.equal(goodDayHint(entries, NONE, day(next))?.key, 'sleepHours')
  assert.equal(goodDayHint(entries, NONE, day(next + 1)), null)
  assert.equal(goodDayHint(diary({ good: GOOD, length: next + 1 }), NONE, day(next)), null)
})
