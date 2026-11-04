// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FLAT_BELOW, trend } from '../src/lib/trend.ts'

test('a lower pain is a way of getting better, a higher one the other way', () => {
  assert.deepEqual(trend(4.3, 5.0, 'lower', FLAT_BELOW.score), { direction: 'down', tone: 'better' })
  assert.deepEqual(trend(5.6, 5.0, 'lower', FLAT_BELOW.score), { direction: 'up', tone: 'worse' })
})

test('a longer sleep is better, a shorter one is not', () => {
  assert.deepEqual(trend(7.1, 6.5, 'higher', FLAT_BELOW.hours), { direction: 'up', tone: 'better' })
  assert.deepEqual(trend(6.0, 6.5, 'higher', FLAT_BELOW.hours), { direction: 'down', tone: 'worse' })
})

test('a change under the smallest one is flat, whichever way it went', () => {
  assert.deepEqual(trend(5.1, 5.0, 'lower', FLAT_BELOW.score), { direction: 'flat', tone: 'same' })
  assert.deepEqual(trend(0.31, 0.3, 'lower', FLAT_BELOW.share), { direction: 'flat', tone: 'same' })
  assert.deepEqual(trend(0.34, 0.3, 'lower', FLAT_BELOW.share), { direction: 'up', tone: 'worse' })
})

test('a figure that is not a number is flat, not an arrow', () => {
  assert.deepEqual(trend(Number.NaN, 5, 'lower', FLAT_BELOW.score), { direction: 'flat', tone: 'same' })
})
