// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sanitizeEntry } from '../src/lib/backupSanitize.ts'
import { isRestDay, restDayCount } from '../src/lib/restDay.ts'

const days = [
  { date: '2026-11-10', restDay: true },
  { date: '2026-11-11' },
  { date: '2026-11-12', restDay: true },
  { date: '2026-11-13', restDay: false },
  { date: '2026-11-20', restDay: true },
]

test('a day is a quiet one only when the person chose it', () => {
  assert.equal(isRestDay(days, '2026-11-10'), true)
  assert.equal(isRestDay(days, '2026-11-11'), false)
  assert.equal(isRestDay(days, '2026-11-13'), false)
  assert.equal(isRestDay(days, '2026-11-14'), false)
  assert.equal(isRestDay([], '2026-11-10'), false)
})

test('the quiet days of a period are counted, both ends included, and nothing else', () => {
  assert.equal(restDayCount(days, '2026-11-10', '2026-11-12'), 2)
  assert.equal(restDayCount(days, '2026-11-11', '2026-11-12'), 1)
  assert.equal(restDayCount(days, '2026-11-10', '2026-11-30'), 3)
  assert.equal(restDayCount(days, '2026-12-01', '2026-12-31'), 0)
})

test('a backup keeps the flag only when it is true, on a day with or without a pain level', () => {
  const base = { date: '2026-11-10', createdAt: 1, updatedAt: 2 }
  assert.equal(sanitizeEntry({ ...base, painLevel: 6, restDay: true })?.restDay, true)
  assert.equal(sanitizeEntry({ ...base, restDay: true })?.restDay, true)
  for (const odd of [false, 'true', 1, null]) assert.equal(sanitizeEntry({ ...base, painLevel: 6, restDay: odd })?.restDay, undefined, String(odd))
  assert.equal('restDay' in (sanitizeEntry({ ...base, painLevel: 6 }) ?? {}), false)
})
