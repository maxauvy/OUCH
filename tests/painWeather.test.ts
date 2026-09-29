// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PainWeatherLevel } from '../src/db/types.ts'
import { colorForPainValue, computePainWeather, painWeatherByLevel } from '../src/lib/painWeather.ts'

const levelOf = (painLevel: number, fatigueLevel?: number, brainFog?: number) =>
  computePainWeather({ painLevel, fatigueLevel, brainFog }).level

test('with pain alone, the level follows the pain score', () => {
  const expected: PainWeatherLevel[] = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5]
  expected.forEach((level, pain) => assert.equal(levelOf(pain), level, `pain ${pain}`))
})

test('fatigue and brain fog can make the day heavier than the pain alone', () => {
  assert.equal(levelOf(4), 3)
  // (4 × 0.6 + 10 × 0.25) / 0.85 ≈ 5.76
  assert.equal(levelOf(4, 10), 4)
  // (4 × 0.6 + 10 × 0.15) / 0.75 = 5.2: brain fog weighs less than fatigue
  assert.equal(levelOf(4, undefined, 10), 3)
  // (4 × 0.6 + 10 × 0.25 + 10 × 0.15) / 1 = 6.4
  assert.equal(levelOf(4, 10, 10), 4)
})

test('a low fatigue or fog lightens a painful day', () => {
  assert.equal(levelOf(8), 5)
  // (8 × 0.6 + 0 × 0.25) / 0.85 ≈ 5.65
  assert.equal(levelOf(8, 0), 4)
  assert.equal(levelOf(8, 0, 0), 3)
})

test('a fatigue of 0 counts as logged, not as missing', () => {
  assert.notEqual(levelOf(8, 0), levelOf(8, undefined))
})

test('the extremes are the first and the last level', () => {
  assert.equal(levelOf(0, 0, 0), 1)
  assert.equal(levelOf(10, 10, 10), 5)
})

test('the reading carries the display of its level', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    const weather = painWeatherByLevel(level)
    assert.equal(weather.level, level)
    assert.match(weather.color, /^#[0-9a-f]{6}$/i)
    assert.match(weather.text, /^var\(--color-weather-\d-text\)$/)
  }
  const distinct = new Set([1, 2, 3, 4, 5].map((l) => painWeatherByLevel(l as PainWeatherLevel).icon))
  assert.equal(distinct.size, 5)
})

test('a bare value gets the color of the same level as a full entry', () => {
  const colorOfLevel = (l: PainWeatherLevel) => painWeatherByLevel(l).color
  assert.equal(colorForPainValue(0), colorOfLevel(1))
  assert.equal(colorForPainValue(1.4), colorOfLevel(1))
  assert.equal(colorForPainValue(1.5), colorOfLevel(2))
  assert.equal(colorForPainValue(3.4), colorOfLevel(2))
  assert.equal(colorForPainValue(3.5), colorOfLevel(3))
  assert.equal(colorForPainValue(5.5), colorOfLevel(4))
  assert.equal(colorForPainValue(7.5), colorOfLevel(5))
  assert.equal(colorForPainValue(10), colorOfLevel(5))
})
