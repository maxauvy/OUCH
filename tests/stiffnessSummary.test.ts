// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeMorningStiffness } from '../src/lib/stiffnessSummary.ts'
import type { DailyEntry } from '../src/db/types.ts'

const day = (date: string, extra: Partial<DailyEntry>): DailyEntry => ({ date, createdAt: 1, updatedAt: 1, ...extra })

test('nothing noted: no days, no band, no intensity', () => {
  const s = summarizeMorningStiffness([day('2026-10-01', { painLevel: 3 })])
  assert.equal(s.noted, 0)
  assert.equal(s.commonest, undefined)
  assert.equal(s.severity, undefined)
  assert.deepEqual(Object.values(s.counts), [0, 0, 0, 0, 0])
})

test('the days are counted band by band, "none" included, and the commonest band named', () => {
  const s = summarizeMorningStiffness([
    day('2026-10-01', { morningStiffness: 'lt30' }),
    day('2026-10-02', { morningStiffness: 'lt30' }),
    day('2026-10-03', { morningStiffness: 'none' }),
    day('2026-10-04', { morningStiffness: 'gt2h' }),
    day('2026-10-05', { painLevel: 4 }),
  ])
  assert.equal(s.noted, 4)
  assert.deepEqual(s.counts, { none: 1, lt30: 2, '30to60': 0, '1to2h': 0, gt2h: 1 })
  assert.equal(s.commonest, 'lt30')
})

test('a tie names no band: the report does not pick one', () => {
  const s = summarizeMorningStiffness([day('2026-10-01', { morningStiffness: 'lt30' }), day('2026-10-02', { morningStiffness: 'gt2h' })])
  assert.equal(s.noted, 2)
  assert.equal(s.commonest, undefined)
})

test('the intensity is averaged over the days it was noted only, 0 included', () => {
  const s = summarizeMorningStiffness([
    day('2026-10-01', { morningStiffness: '1to2h', morningStiffnessSeverity: 0 }),
    day('2026-10-02', { morningStiffness: '1to2h', morningStiffnessSeverity: 6 }),
    day('2026-10-03', { morningStiffness: 'none' }),
  ])
  assert.deepEqual(s.severity, { mean: 3, n: 2 })
})
