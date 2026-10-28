// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeNightWakings } from '../src/lib/nightWakings.ts'
import type { DailyEntry } from '../src/db/types.ts'

const day = (date: string, extra: Partial<DailyEntry>): DailyEntry => ({ date, createdAt: 1, updatedAt: 1, ...extra })

test('no day noted: nothing, and no mean', () => {
  assert.deepEqual(summarizeNightWakings([day('2026-10-01', { painLevel: 4 })]), { noted: 0, withWaking: 0 })
})

test('"none" is an answer: it counts as a day noted, not as a day with a waking', () => {
  const s = summarizeNightWakings([day('2026-10-01', { nightWakings: 0 }), day('2026-10-02', { nightWakings: 2 }), day('2026-10-03', { nightWakings: 3 }), day('2026-10-04', {})])
  assert.deepEqual(s, { noted: 3, withWaking: 2, mean: 5 / 3 })
})
