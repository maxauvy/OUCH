// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { sanitizeEntry } from '../src/lib/backupSanitize.ts'
import { contributorDays, isUnusual, toggleContributor, unusualDay } from '../src/lib/contributors.ts'
import { shiftISO } from '../src/lib/dates.ts'

const START = '2026-01-01'
const day = (n: number) => shiftISO(START, n)
/** `count` days before day 40 with pain 3 and sleep 7 h, day 12 to 39 at most. */
const history = (count: number): Pick<DailyEntry, 'date' | 'painLevel' | 'sleepHours'>[] =>
  Array.from({ length: count }, (_, i) => ({ date: day(39 - i), painLevel: 3, sleepHours: 7 }))

test('a day stands out when its pain is two points above the usual: 5 does, 4 does not', () => {
  const entries = history(20)
  assert.equal(unusualDay({ painLevel: 5 }, entries, day(40)).pain, true)
  assert.equal(unusualDay({ painLevel: 4 }, entries, day(40)).pain, false)
  assert.equal(unusualDay({ painLevel: 9 }, entries, day(40)).pain, true)
})

test('a night stands out when it is an hour and a half shorter than the usual: 5.5 does, 5.6 does not', () => {
  const entries = history(20)
  assert.equal(unusualDay({ sleepHours: 5.5 }, entries, day(40)).sleep, true)
  assert.equal(unusualDay({ sleepHours: 5.6 }, entries, day(40)).sleep, false)
  assert.equal(unusualDay({ sleepHours: 9 }, entries, day(40)).sleep, false)
})

test('nothing stands out without a usual to compare with, or without the figure itself', () => {
  assert.deepEqual(unusualDay({ painLevel: 9, sleepHours: 2 }, history(9), day(40)), { pain: false, sleep: false })
  assert.deepEqual(unusualDay({}, history(20), day(40)), { pain: false, sleep: false })
  // The usual is taken from the 28 days before, not from older days.
  assert.deepEqual(unusualDay({ painLevel: 5 }, history(20), day(100)), { pain: false, sleep: false })
  assert.equal(isUnusual({ pain: false, sleep: true }), true)
  assert.equal(isUnusual({ pain: false, sleep: false }), false)
})

test('touching a label puts it in or takes it out, and the list keeps the app order', () => {
  assert.deepEqual(toggleContributor(undefined, 'stress'), ['stress'])
  assert.deepEqual(toggleContributor(['stress'], 'sleep'), ['sleep', 'stress'])
  assert.deepEqual(toggleContributor(['sleep', 'stress'], 'sleep'), ['stress'])
  assert.deepEqual(toggleContributor(['stress'], 'stress'), [])
  assert.deepEqual(toggleContributor(['treatment', 'weather'], 'effort'), ['effort', 'weather', 'treatment'])
})

test('the labels of a period are counted by day, the most often first, ties in the app order', () => {
  const entries = [
    { date: '2026-11-09', contributors: ['sleep' as const] },
    { date: '2026-11-10', contributors: ['stress' as const, 'sleep' as const] },
    { date: '2026-11-11', contributors: ['weather' as const] },
    { date: '2026-11-12', contributors: ['stress' as const] },
    { date: '2026-11-13' },
    { date: '2026-11-20', contributors: ['infection' as const] },
  ]
  assert.deepEqual(contributorDays(entries, '2026-11-10', '2026-11-13'), [
    { factor: 'stress', days: 2 },
    { factor: 'sleep', days: 1 },
    { factor: 'weather', days: 1 },
  ])
  assert.deepEqual(contributorDays(entries, '2026-12-01', '2026-12-31'), [])
})

test('a backup keeps the labels that exist, once, in the app order, and nothing when none is left', () => {
  const base = { date: '2026-11-10', painLevel: 6, createdAt: 1, updatedAt: 2 }
  assert.deepEqual(sanitizeEntry({ ...base, contributors: ['stress', 'sleep', 'stress', 'luck', 7] })?.contributors, ['sleep', 'stress'])
  for (const odd of [[], ['luck'], 'sleep', null]) assert.equal(sanitizeEntry({ ...base, contributors: odd })?.contributors, undefined, JSON.stringify(odd))
})
