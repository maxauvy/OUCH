// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/medications.ts'
import { BONFERRONI_Z_7, MIN_PER_WEEKDAY, weekdayIndex, weekdayProfile } from '../src/lib/weekdays.ts'

// 2026-10-05 is a Monday.
const MONDAY = '2026-10-05'
const entry = (date: string, painLevel: number): LoggedEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0 }) as LoggedEntry

/** `weeks` full weeks from a Monday, pain given per weekday (Monday first), plus a small alternating wobble. */
function weeks(count: number, perDay: number[], wobble = 0): LoggedEntry[] {
  const out: LoggedEntry[] = []
  for (let w = 0; w < count; w++) for (let d = 0; d < 7; d++) out.push(entry(shiftISO(MONDAY, w * 7 + d), perDay[d]! + (w % 2 ? wobble : -wobble)))
  return out
}

test('weekdays count from Monday', () => {
  assert.equal(weekdayIndex('2026-10-05'), 0)
  assert.equal(weekdayIndex('2026-10-10'), 5)
  assert.equal(weekdayIndex('2026-10-11'), 6)
})

test('nothing is said until every weekday has four days', () => {
  assert.equal(MIN_PER_WEEKDAY, 4)
  assert.equal(weekdayProfile(weeks(3, [4, 4, 4, 4, 5, 3, 3])), null)
  assert.ok(weekdayProfile(weeks(4, [4, 4, 4, 4, 5, 3, 3])))
  // A weekday short of days, even with plenty of the others.
  const missingSundays = weeks(8, [4, 4, 4, 4, 5, 3, 3]).filter((e) => weekdayIndex(e.date) !== 6)
  assert.equal(weekdayProfile(missingSundays), null)
})

test('a clear weekday pattern stands out of the chance band', () => {
  const p = weekdayProfile(weeks(12, [4, 4, 4, 4, 6, 2, 3], 1))!
  assert.equal(p.total, 84)
  assert.equal(p.minDays, 12)
  assert.equal(p.best?.index, 5)
  assert.equal(p.worst?.index, 4)
  assert.equal(p.best?.jsDay, 6)
  assert.equal(p.worst?.jsDay, 5)
  assert.ok(p.bestStandsOut && p.worstStandsOut)
  assert.ok(Math.abs(p.days[4]!.gap - (p.days[4]!.mean - p.overall)) < 1e-9)
})

test('weekdays that only differ by noise do not stand out', () => {
  // Same weekly mean everywhere, an irregular series: small gaps against a wide band.
  const noisy = Array.from({ length: 84 }, (_, i) => entry(shiftISO(MONDAY, i), [2, 7, 3, 6, 4, 5, 3, 8, 2, 6][(i * 7) % 10]!))
  const p = weekdayProfile(noisy)!
  assert.equal(p.bestStandsOut, false)
  assert.equal(p.worstStandsOut, false)
})

test('the band is 2.69 standard errors of the weekday with the fewest days', () => {
  const p = weekdayProfile(weeks(5, [3, 3, 3, 3, 3, 3, 3], 1))!
  // 35 values, half 2 and half 4 (ish): sd close to 1; 5 days per weekday.
  const expected = (BONFERRONI_Z_7 * Math.sqrt(p.total / (p.total - 1))) / Math.sqrt(5)
  assert.ok(Math.abs(p.band - expected) < 0.1, `${p.band} vs ${expected}`)
})

test('no best or worst day when every weekday is the same', () => {
  const p = weekdayProfile(weeks(6, [4, 4, 4, 4, 4, 4, 4]))!
  assert.equal(p.best, null)
  assert.equal(p.worst, null)
  assert.equal(p.bestStandsOut, false)
})
