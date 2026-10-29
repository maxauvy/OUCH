import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysBetween, shiftISO, todayISO } from '../src/lib/dates.ts'
import { mean, median, quantile, sd, spearman } from '../src/lib/stats.ts'

test('shiftISO crosses month, year and leap-day boundaries', () => {
  assert.equal(shiftISO('2026-01-31', 1), '2026-02-01')
  assert.equal(shiftISO('2026-01-01', -1), '2025-12-31')
  assert.equal(shiftISO('2028-02-28', 1), '2028-02-29')
})

test('daysBetween counts calendar days, whatever the daylight saving', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2)
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
  assert.equal(daysBetween('2026-05-10', '2026-05-08'), -2)
})

test('todayISO reads the device calendar day, not the UTC one', () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(todayISO(new Date(2026, 5, 15, 0, 30)), '2026-06-15')
  assert.equal(todayISO(new Date(2026, 5, 15, 23, 30)), '2026-06-15')
})

test('descriptive statistics', () => {
  assert.equal(mean([1, 2, 3, 6]), 3)
  assert.equal(median([5, 1, 3]), 3)
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5)
  assert.equal(sd([4]), 0)
  assert.ok(Math.abs(sd([2, 4, 4, 4, 5, 5, 7, 9]) - 2.138) < 0.001)
  assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1)
  assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1)
  assert.ok(Number.isNaN(spearman([1, 1, 1], [1, 2, 3])))
})
