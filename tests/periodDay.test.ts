// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { periodDayOf } from '../src/lib/periodDay.ts'

test('a light or heavy flow is a day of the period; none and spotting are not', () => {
  assert.equal(periodDayOf({ periodFlow: 'light' }), true)
  assert.equal(periodDayOf({ periodFlow: 'heavy' }), true)
  assert.equal(periodDayOf({ periodFlow: 'none' }), false)
  assert.equal(periodDayOf({ periodFlow: 'spotting' }), false)
})

test('the flow wins over the switch when both are there', () => {
  assert.equal(periodDayOf({ periodFlow: 'none', periodDay: true }), false)
  assert.equal(periodDayOf({ periodFlow: 'heavy', periodDay: false }), true)
})

test('without a flow the switch is read as it was, and unanswered stays unanswered', () => {
  assert.equal(periodDayOf({ periodDay: true }), true)
  assert.equal(periodDayOf({ periodDay: false }), false)
  assert.equal(periodDayOf({}), undefined)
})
