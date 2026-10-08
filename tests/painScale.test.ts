// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { segmentStrength, stepPain } from '../src/lib/painScale.ts'

test('one point more or less, kept between 0 and 10', () => {
  assert.equal(stepPain(5, 1), 6)
  assert.equal(stepPain(5, -1), 4)
  assert.equal(stepPain(10, 1), 10)
  assert.equal(stepPain(0, -1), 0)
})

test('nothing to step from until a value is chosen', () => {
  assert.equal(stepPain(undefined, 1), undefined)
  assert.equal(stepPain(undefined, -1), undefined)
})

test('the colour deepens with pain, from a quarter to the full brand colour', () => {
  assert.equal(segmentStrength(0), 25)
  assert.equal(segmentStrength(10), 100)
  for (let i = 1; i <= 10; i++) assert.ok(segmentStrength(i) > segmentStrength(i - 1))
})
