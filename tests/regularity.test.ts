// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry, Medication } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/dates.ts'
import { MIN_MISSED, regularityReading } from '../src/lib/regularity.ts'
import { markDone, todayMessages } from '../src/lib/todayMessages.ts'

const today = '2026-11-10'
const med = (id: string, regimen: Medication['regimen'] = 'scheduled', end?: string): Medication =>
  ({ id, name: id, regimen, periods: [{ start: '2026-01-01', end }], createdAt: 0, updatedAt: 0 }) as Medication
const day = (back: number, id: string, doses?: number): DailyEntry =>
  ({ date: shiftISO(today, -back), painLevel: 3, intakes: [{ medicationId: id, doses }], createdAt: 0, updatedAt: 0 }) as DailyEntry

test('only doses marked missed count, and only from MIN_MISSED of them', () => {
  const two = [day(1, 'a', 0), day(2, 'a', 0), day(3, 'a', 1)]
  assert.equal(regularityReading(two, [med('a')], today), null)
  const three = [...two, day(5, 'a', 0)]
  const r = regularityReading(three, [med('a')], today)
  assert.equal(MIN_MISSED, 3)
  assert.deepEqual([r?.missed, r?.noted, r?.last], [3, 4, shiftISO(today, -1)])
})

test('days with nothing noted are not missed, older days and today are left out', () => {
  const old = [day(15, 'a', 0), day(16, 'a', 0), day(20, 'a', 0), day(0, 'a', 0), day(1, 'a', 0)]
  assert.equal(regularityReading(old, [med('a')], today), null)
})

test('as-needed treatments and treatments stopped long ago say nothing', () => {
  const miss = [day(1, 'a', 0), day(2, 'a', 0), day(3, 'a', 0)]
  assert.equal(regularityReading(miss, [med('a', 'asNeeded')], today), null)
  assert.equal(regularityReading(miss, [med('a', 'scheduled', '2026-09-01')], today), null)
})

test('the most missed treatment is the one named', () => {
  const e = [1, 2, 3].flatMap((n) => [day(n, 'a', 0)]).concat([1, 2, 3, 4].map((n) => day(n + 3, 'b', 0)))
  assert.equal(regularityReading(e, [med('a'), med('b')], today)?.name, 'b')
})

test('the word is a message: once thanked it stays away until a new miss, and never on a hard day', () => {
  const reading = { medicationId: 'a', name: 'a', missed: 3, noted: 5, last: '2026-11-09' }
  const base = { today, quiet: false, later: undefined, allow: { leads: false, weekly: false, trials: false, calm: false, month: false, regularity: true }, leads: [], leadChoices: undefined, tried: [], weekly: null, repeat: null, invite: false, calm: null, month: null, trial: undefined, regularity: reading }
  assert.equal(todayMessages(base).items[0]?.kind, 'regularity')
  assert.equal(todayMessages({ ...base, later: markDone(undefined, 'regularity:a:2026-11-09') }).count, 0)
  assert.equal(todayMessages({ ...base, later: markDone(undefined, 'regularity:a:2026-11-09'), regularity: { ...reading, last: '2026-11-10' } }).count, 1)
  assert.equal(todayMessages({ ...base, quiet: true }).count, 0)
  assert.equal(todayMessages({ ...base, allow: { ...base.allow, regularity: false } }).count, 0)
})
