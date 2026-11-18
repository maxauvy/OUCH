import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLook } from '../src/lib/lookChoice.ts'

test('nothing stored, or anything unknown, is the default weather look', () => {
  assert.equal(parseLook(null), 'meteo')
  assert.equal(parseLook(''), 'meteo')
  assert.equal(parseLook('luminous'), 'meteo')
})

test('the lighter look is kept, and those who had gone back to the classic look get it', () => {
  assert.equal(parseLook('leger'), 'leger')
  assert.equal(parseLook('classic'), 'leger')
})

test('a bare pain value falls in the weather of the same thresholds as the day', async () => {
  const { levelForPainValue } = await import('../src/lib/painWeather.ts')
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(levelForPainValue), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5])
})
