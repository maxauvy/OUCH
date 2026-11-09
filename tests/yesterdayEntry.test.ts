// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { missedYesterday } from '../src/lib/yesterdayEntry.ts'

const days = (...dates: string[]) => dates.map((date) => ({ date }))

test('yesterday missed after a day that was written: it is offered', () => {
  assert.equal(missedYesterday(days('2026-11-07', '2026-11-06'), '2026-11-09'), '2026-11-08')
})

test('yesterday already written: nothing is offered', () => {
  assert.equal(missedYesterday(days('2026-11-08', '2026-11-07'), '2026-11-09'), null)
})

test('two days in a row missed: not a reproach, nothing is offered', () => {
  assert.equal(missedYesterday(days('2026-11-06', '2026-11-05'), '2026-11-09'), null)
})

test('a new person, or someone who has been away, is not asked', () => {
  assert.equal(missedYesterday([], '2026-11-09'), null)
  assert.equal(missedYesterday(days('2026-11-09'), '2026-11-09'), null)
  assert.equal(missedYesterday(days('2026-10-01', '2026-10-02'), '2026-11-09'), null)
})

test('works across a month boundary', () => {
  assert.equal(missedYesterday(days('2026-10-30'), '2026-11-01'), '2026-10-31')
})
