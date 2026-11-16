import test from 'node:test'
import assert from 'node:assert/strict'
import { dayPart } from '../src/lib/dayPart.ts'

test('hours fall into four parts of the day', () => {
  assert.equal(dayPart(5), 'morning')
  assert.equal(dayPart(11), 'morning')
  assert.equal(dayPart(12), 'afternoon')
  assert.equal(dayPart(17), 'afternoon')
  assert.equal(dayPart(18), 'evening')
  assert.equal(dayPart(22), 'evening')
  assert.equal(dayPart(23), 'night')
  assert.equal(dayPart(0), 'night')
  assert.equal(dayPart(4), 'night')
})
