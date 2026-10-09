// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasPain, loggedEntries } from '../src/lib/loggedEntries.ts'
import type { DailyEntry } from '../src/db/types.ts'

const day = (date: string, painLevel?: number): DailyEntry =>
  ({ date, painLevel, createdAt: 0, updatedAt: 0 }) as DailyEntry

test('a pain of 0 is a logged day, a missing pain is not', () => {
  assert.equal(hasPain(day('2026-01-01', 0)), true)
  assert.equal(hasPain(day('2026-01-01', 7)), true)
  assert.equal(hasPain(day('2026-01-01')), false)
})

test('loggedEntries keeps the days with pain, in order', () => {
  const all = [day('2026-01-01', 0), day('2026-01-02'), day('2026-01-03', 4)]
  assert.deepEqual(
    loggedEntries(all).map((e) => e.date),
    ['2026-01-01', '2026-01-03']
  )
})
