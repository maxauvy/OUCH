// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { painVsRecent, weekVsWeekBefore } from '../src/lib/painTrend.ts'
import { shiftISO } from '../src/lib/dates.ts'

const day = (back: number, painLevel?: number) => ({ date: shiftISO('2026-10-20', -back), painLevel })

test('fewer than three logged days before: no reading', () => {
  assert.equal(painVsRecent('2026-10-20', 5, [day(1, 4), day(2, 4)]), null)
  assert.equal(painVsRecent('2026-10-20', 5, [day(1, 4), day(2, 4), day(3, undefined)]), null)
})

test('only the six days before count, and the day itself does not', () => {
  const entries = [day(0, 9), day(1, 4), day(2, 4), day(3, 4), day(7, 0)]
  const r = painVsRecent('2026-10-20', 6, entries)!
  assert.equal(r.n, 3)
  assert.equal(r.delta, 2)
  assert.equal(r.trend, 'higher')
})

test('a gap under half a point is the same, on either side', () => {
  const base = [day(1, 4), day(2, 4), day(3, 4)]
  assert.equal(painVsRecent('2026-10-20', 4.4, base)!.trend, 'same')
  assert.equal(painVsRecent('2026-10-20', 3.6, base)!.trend, 'same')
  assert.equal(painVsRecent('2026-10-20', 4.5, base)!.trend, 'higher')
  assert.equal(painVsRecent('2026-10-20', 3.5, base)!.trend, 'lower')
})

test('week against the week before: needs three logged days in each, compares their means', () => {
  const now = [day(0, 2), day(2, 3), day(5, 4)]
  assert.equal(weekVsWeekBefore('2026-10-20', now), null)
  assert.equal(weekVsWeekBefore('2026-10-20', [...now, day(7, 6), day(9, 5)]), null)
  assert.equal(weekVsWeekBefore('2026-10-20', [...now, day(7, 6), day(9, 5), day(13, 4)]), 'lower')
  assert.equal(weekVsWeekBefore('2026-10-20', [...now, day(7, 3), day(9, 3), day(13, 3.2)]), 'same')
  assert.equal(weekVsWeekBefore('2026-10-20', [...now, day(7, 1), day(9, 1), day(13, 1), day(14, 9)]), 'higher')
})
