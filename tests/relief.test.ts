// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SESSION_SECONDS, breathAt } from '../src/lib/relief.ts'

test('the breath is 4 seconds in, then 6 out, and counts the seconds left', () => {
  assert.deepEqual(breathAt(0), { phase: 'in', left: 4, breaths: 0, done: false })
  assert.deepEqual(breathAt(3500), { phase: 'in', left: 1, breaths: 0, done: false })
  assert.deepEqual(breathAt(4000), { phase: 'out', left: 6, breaths: 0, done: false })
  assert.deepEqual(breathAt(9999), { phase: 'out', left: 1, breaths: 0, done: false })
  assert.deepEqual(breathAt(10000), { phase: 'in', left: 4, breaths: 1, done: false })
})

test('it ends by itself after three minutes, and a negative time is the start', () => {
  assert.equal(SESSION_SECONDS, 180)
  assert.equal(breathAt(179_000).done, false)
  assert.deepEqual(breathAt(180_000), { phase: 'out', left: 0, breaths: 18, done: true })
  assert.equal(breathAt(-5).phase, 'in')
})
