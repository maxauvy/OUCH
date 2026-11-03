// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparePeriods, figures, MIN_LOGGED, presetSpans, usualPainGap, validSpans, windowFor } from '../src/lib/periodComparison.ts'
import type { LoggedEntry } from '../src/db/types.ts'

const day = (n: number) => new Date(Date.parse('2026-01-01T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
const entry = (n: number, painLevel: number, extra: Partial<LoggedEntry> = {}): LoggedEntry => ({ date: day(n), painLevel, createdAt: 0, updatedAt: 0, ...extra })
const run = (from: number, to: number, pain: (n: number) => number) => Array.from({ length: to - from + 1 }, (_, i) => entry(from + i, pain(from + i)))

test('the figures of a stretch: logged days, mean, severe days, flare days, the leading stiffness band', () => {
  const entries = [entry(0, 4, { morningStiffness: 'lt30' }), entry(1, 8, { morningStiffness: 'lt30' }), entry(2, 6), entry(10, 9)]
  const f = figures(entries, { from: day(0), to: day(4) }, new Set([day(1), day(2)]))
  assert.deepEqual(f, { days: 5, logged: 3, pain: 6, severe: 1, flareDays: 2, stiffness: 'lt30' })
  assert.equal(figures(entries, { from: day(0), to: day(4) }, null).flareDays, null)
  assert.equal(figures(entries, { from: day(20), to: day(25) }, null).pain, null)
})

test('the usual gap needs six pairs of windows, each half logged, and is the 80% quantile', () => {
  // 8 windows of 14 days alternating 4 and 5: every gap is 1
  const entries = run(0, 8 * 14 - 1, (n) => (Math.floor(n / 14) % 2 === 0 ? 4 : 5))
  assert.equal(usualPainGap(entries, 14, day(8 * 14 - 1)), 1)
  // only 4 windows: three pairs, not enough
  assert.equal(usualPainGap(run(0, 4 * 14 - 1, () => 4), 14, day(55)), null)
  // windows less than half logged are left out
  const sparse = run(0, 8 * 14 - 1, () => 4).filter((e) => Number(e.date.slice(-2)) % 3 === 0)
  assert.equal(usualPainGap(sparse, 14, day(8 * 14 - 1)), null)
})

test('the window follows the shorter stretch, within bounds', () => {
  assert.equal(windowFor({ from: day(0), to: day(29) }, { from: day(30), to: day(59) }), 30)
  assert.equal(windowFor({ from: day(0), to: day(4) }, { from: day(5), to: day(40) }), 14)
  assert.equal(windowFor({ from: day(0), to: day(199) }, { from: day(200), to: day(399) }), 60)
})

test('a comparison: the gap is set against the usual one, and only with enough days', () => {
  const entries = run(0, 8 * 14 - 1, (n) => (Math.floor(n / 14) % 2 === 0 ? 4 : 5))
  const a = { from: day(14 * 6), to: day(14 * 7 - 1) }
  const b = { from: day(14 * 7), to: day(14 * 8 - 1) }
  const c = comparePeriods(entries, a, b, null, day(8 * 14 - 1))
  assert.deepEqual([c.enough, c.diff, c.gap, c.within, c.windowDays], [true, 1, 1, true, 14])
  const thin = comparePeriods(entries.slice(0, MIN_LOGGED + 2), a, b, null, day(8 * 14 - 1))
  assert.deepEqual([thin.enough, thin.gap, thin.within], [false, null, null])
})

test('a gap bigger than the usual one is outside it', () => {
  const entries = run(0, 8 * 14 - 1, (n) => (Math.floor(n / 14) === 7 ? 8 : 4 + (Math.floor(n / 14) % 2) * 0.5))
  const c = comparePeriods(entries, { from: day(14 * 6), to: day(14 * 7 - 1) }, { from: day(14 * 7), to: day(14 * 8 - 1) }, null, day(8 * 14 - 1))
  assert.equal(c.within, false)
})

test('spans must run forward, not overlap, and not reach into the future', () => {
  const a = { from: day(0), to: day(9) }
  assert.equal(validSpans(a, { from: day(10), to: day(19) }, day(30)), true)
  assert.equal(validSpans(a, { from: day(9), to: day(19) }, day(30)), false)
  assert.equal(validSpans(a, { from: day(10), to: day(40) }, day(30)), false)
  assert.equal(validSpans({ from: day(5), to: day(1) }, { from: day(10), to: day(19) }, day(30)), false)
})

test('the presets: 30 days against the 30 before; the time since the last visit against as long before', () => {
  const p = presetSpans('days30', day(100))!
  assert.deepEqual(p, { a: { from: day(41), to: day(70) }, b: { from: day(71), to: day(100) } })
  const v = presetSpans('sinceVisit', day(100), day(90))!
  assert.deepEqual(v, { a: { from: day(79), to: day(89) }, b: { from: day(90), to: day(100) } })
  assert.equal(presetSpans('sinceVisit', day(100), undefined), null)
  assert.equal(presetSpans('sinceVisit', day(100), day(100)), null)
})
