// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bigDayBefore, pacingReading } from '../src/lib/pacing.ts'
import type { LoggedEntry } from '../src/db/types.ts'

const day = (n: number) => new Date(Date.parse('2026-01-01T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
const e = (n: number, painLevel: number, activityLevel?: number): LoggedEntry => ({ date: day(n), painLevel, ...(activityLevel === undefined ? {} : { activityLevel }), createdAt: 0, updatedAt: 0 })

/** Pain 4 on ordinary days; every 5th day is busy (activity 9), others 3. After a busy day, `after` is the next day's pain. */
function diary(days: number, after: number): LoggedEntry[] {
  return Array.from({ length: days }, (_, n) => (n % 5 === 0 ? e(n, 4, 9) : n % 5 === 1 ? e(n, after, 3) : e(n, 4, 3)))
}

test('too few days with the activity noted: no reading', () => {
  assert.equal(pacingReading(diary(25, 4)), null)
})

test('days after busy ones as hard as usual: within chance', () => {
  const r = pacingReading(diary(80, 4))!
  assert.equal(r.verdict, 'within')
  assert.equal(r.observed, 0)
})

test('days after busy ones always harder than usual: above what chance gives', () => {
  const r = pacingReading(diary(80, 8))!
  assert.equal(r.verdict, 'above')
  assert.ok(r.observed > r.high)
  assert.ok(r.k >= 5 && r.expected < r.observed)
  assert.ok(r.low <= r.expected && r.expected <= r.high + 1)
})

test('days after busy ones gentler than usual: below what chance gives', () => {
  // The next day is much lower, while days in general are harder than usual about as often as chance.
  const entries = Array.from({ length: 120 }, (_, n) => (n % 4 === 0 ? e(n, 4, 9) : n % 4 === 1 ? e(n, 0, 3) : e(n, n % 8 < 4 ? 6 : 3, 3)))
  const r = pacingReading(entries)
  assert.ok(r === null || r.verdict !== 'above')
})

test('the busy days with no next day logged are left out', () => {
  const entries = diary(80, 8).filter((x) => !(Number(x.date.slice(8)) % 2 === 0 && x.painLevel === 8))
  const r = pacingReading(entries)
  assert.ok(r === null || r.k < 16)
})

test('a big day before: only a really high level, relative to the person, with enough history', () => {
  const history = Array.from({ length: 40 }, (_, n) => e(n, 4, n % 5 === 0 ? 9 : 3))
  assert.equal(bigDayBefore([...history, e(40, 4, 9)], day(41)), true)
  assert.equal(bigDayBefore([...history, e(40, 4, 3)], day(41)), false)
  assert.equal(bigDayBefore([...history, e(38, 4, 9)], day(41)), false)
  assert.equal(bigDayBefore(history.slice(0, 10), day(11)), false)
  // a person whose busiest days are only moderate is not told "you gave a lot"
  const mild = Array.from({ length: 40 }, (_, n) => e(n, 4, n % 5 === 0 ? 5 : 2))
  assert.equal(bigDayBefore([...mild, e(40, 4, 5)], day(41)), false)
})
