// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { daysLate, lateCount } from '../src/lib/lateEntries.ts'

// Local times, as the device writes them.
const at = (iso: string) => new Date(iso).getTime()
const entry = (date: string, createdAt: number) => ({ date, createdAt })

test('written on the day itself is not late', () => {
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-03T20:14:00'))), 0)
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-03T00:05:00'))), 0)
})

test('the small hours after midnight still count as the same evening', () => {
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-04T00:30:00'))), 0)
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-04T03:59:00'))), 0)
})

test('from 04:00 the next day, it is one day late', () => {
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-04T04:00:00'))), 1)
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-04T09:12:00'))), 1)
})

test('a few days later counts the whole days', () => {
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-05T09:12:00'))), 2)
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-13T09:12:00'))), 10)
})

test('an entry created before its date, or without a creation time, is never late', () => {
  assert.equal(daysLate(entry('2026-11-03', at('2026-11-01T10:00:00'))), 0)
  assert.equal(daysLate(entry('2026-11-03', 0)), 0)
})

test('the report counts from two days after, not the day after', () => {
  const list = [
    entry('2026-11-01', at('2026-11-01T21:00:00')),
    entry('2026-11-02', at('2026-11-03T09:00:00')),
    entry('2026-11-03', at('2026-11-05T09:00:00')),
    entry('2026-11-04', at('2026-11-12T09:00:00')),
  ]
  assert.equal(lateCount(list), 2)
})
