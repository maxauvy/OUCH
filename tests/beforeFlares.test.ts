// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import { MIN_FLARES, beforeFlares } from '../src/lib/beforeFlares.ts'
import { detectFlares } from '../src/lib/flares.ts'
import { shiftISO } from '../src/lib/dates.ts'

const START = '2026-01-01'
const day = (n: number) => shiftISO(START, n)

interface Shape {
  length?: number
  /** Days (offsets) on which a three-day flare starts */
  flares: number[]
  /** What the three days before a flare hold, per measure; the rest of the time a measure is constant */
  before?: Partial<Record<'sleepHours' | 'stressLevel' | 'fatigueLevel', number[]>>
  /** Sleep during the flare itself */
  duringSleep?: number
  /** Which of the flares (by index) the `before` values apply to; all by default */
  only?: number[]
}

/** Pain 3, with a flare of three days at 7; sleep 7 h, stress 4, fatigue 4; the three days before the flares as asked. */
function diary(shape: Shape): LoggedEntry[] {
  const length = shape.length ?? 400
  const out: LoggedEntry[] = []
  for (let n = 0; n < length; n++) {
    const flare = shape.flares.findIndex((s) => n >= s && n < s + 3)
    const upcoming = shape.flares.findIndex((s) => n >= s - 3 && n < s)
    const applies = upcoming >= 0 && (!shape.only || shape.only.includes(upcoming))
    const at = applies ? n - (shape.flares[upcoming]! - 3) : 0
    out.push({
      date: day(n),
      painLevel: flare >= 0 ? 7 : 3,
      sleepHours: flare >= 0 && shape.duringSleep !== undefined ? shape.duringSleep : applies && shape.before?.sleepHours ? shape.before.sleepHours[at] : 7,
      stressLevel: applies && shape.before?.stressLevel ? shape.before.stressLevel[at] : 4,
      fatigueLevel: applies && shape.before?.fatigueLevel ? shape.before.fatigueLevel[at] : 4,
      createdAt: 0,
      updatedAt: 0,
    })
  }
  return out
}
const STARTS = [60, 110, 160, 210, 260, 310, 360]
const read = (shape: Shape) => {
  const entries = diary(shape)
  return beforeFlares(entries, detectFlares(entries))
}

test('the set up: seven flares are found in the synthetic diary', () => {
  assert.equal(detectFlares(diary({ flares: STARTS })).length, STARTS.length)
})

test('under four flares nothing is said', () => {
  assert.equal(MIN_FLARES, 4)
  assert.equal(read({ flares: STARTS.slice(0, 3) }), null)
  assert.notEqual(read({ flares: STARTS.slice(0, 4), before: { sleepHours: [4, 4, 4] } }), null)
})

test('a measure that was less favourable before every flare, never otherwise, stands out; the others do not', () => {
  const r = read({ flares: STARTS, before: { sleepHours: [4.5, 4.5, 4.5] } })!
  assert.equal(r.flares, 7)
  assert.deepEqual(r.above.map((x) => x.key), ['sleepHours'])
  const sleep = r.rows.find((x) => x.key === 'sleepHours')!
  assert.deepEqual([sleep.n, sleep.observed, sleep.verdict], [7, 7, 'above'])
  for (const row of r.rows.filter((x) => x.key !== 'sleepHours')) assert.equal(row.verdict, 'within', row.key)
})

test('when the three days before look like any others, nothing stands out', () => {
  const r = read({ flares: STARTS })!
  assert.deepEqual(r.above, [])
  assert.ok(r.rows.every((x) => x.observed === 0 && x.verdict === 'within'))
})

test('the days of a flare itself are not a reference: sleep that drops during flares does not make the others look worse', () => {
  const r = read({ flares: STARTS, duringSleep: 2, before: { sleepHours: [4.5, 4.5, 4.5] } })!
  const sleep = r.rows.find((x) => x.key === 'sleepHours')!
  assert.ok(sleep.expected < 0.5, `chance gives ${sleep.expected.toFixed(2)}`)
  assert.equal(sleep.verdict, 'above')
})

test('less favourable means by at least half a unit: 0.4 of an hour is not, 0.5 is', () => {
  const small = read({ flares: STARTS, before: { sleepHours: [6.6, 6.6, 6.6] } })!
  assert.equal(small.rows.find((x) => x.key === 'sleepHours')!.observed, 0)
  const half = read({ flares: STARTS, before: { sleepHours: [6.5, 6.5, 6.5] } })!
  assert.equal(half.rows.find((x) => x.key === 'sleepHours')!.observed, 7)
})

test('higher is worse for stress and fatigue, lower is worse for sleep', () => {
  const r = read({ flares: STARTS, before: { stressLevel: [6, 6, 6], fatigueLevel: [2, 2, 2], sleepHours: [9, 9, 9] } })!
  assert.deepEqual(r.above.map((x) => x.key), ['stressLevel'])
  assert.equal(r.rows.find((x) => x.key === 'fatigueLevel')!.observed, 0)
  assert.equal(r.rows.find((x) => x.key === 'sleepHours')!.observed, 0)
})

test('the measures above the band come largest excess first', () => {
  const r = read({ flares: STARTS, before: { sleepHours: [4.5, 4.5, 4.5], stressLevel: [6, 6, 6] }, only: [0, 1, 2, 3, 4] })!
  assert.deepEqual(r.above.map((x) => x.key), ['sleepHours', 'stressLevel'])
  const a = read({ flares: STARTS, before: { sleepHours: [4.5, 4.5, 4.5] }, only: [0, 1, 2, 3, 4, 5, 6] })!
  const b = read({ flares: STARTS, before: { sleepHours: [4.5, 4.5, 4.5] }, only: [0, 1, 2, 3, 4] })!
  assert.equal(a.rows.find((x) => x.key === 'sleepHours')!.observed, 7)
  assert.equal(b.rows.find((x) => x.key === 'sleepHours')!.observed, 5)
})

test('with too short a diary there are too few days to tell how often a window is less favourable: no rows, no card', () => {
  const short = diary({ length: 62, flares: [20, 30, 40, 50], before: { sleepHours: [4, 4, 4] } })
  assert.equal(detectFlares(short).length, 4)
  assert.equal(beforeFlares(short, detectFlares(short)), null)
  // The same flares in a diary long enough to know what is usual give a reading.
  const long = diary({ length: 140, flares: [60, 80, 100, 120], before: { sleepHours: [4, 4, 4] } })
  assert.notEqual(beforeFlares(long, detectFlares(long)), null)
})
