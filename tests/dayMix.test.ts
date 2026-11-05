// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dayMix } from '../src/lib/dayMix.ts'

const now = { mild: 0.34, moderate: 0.48, severe: 0.17 }
const before = { mild: 0.25, moderate: 0.61, severe: 0.14 }

test('each class gets its share, the share before and the gap in points', () => {
  const rows = dayMix(now, before)
  assert.deepEqual(
    rows.map((r) => [r.key, r.points]),
    [['mild', 9], ['moderate', -13], ['severe', 3]]
  )
  assert.equal(rows[0]!.prev, 0.25)
})

test('more mild days and fewer severe days are better; the moderate days say nothing alone', () => {
  const rows = dayMix(now, before)
  assert.deepEqual(rows.map((r) => r.direction), ['better', 'neutral', 'worse'])
  const calmer = dayMix({ mild: 0.2, moderate: 0.5, severe: 0.3 }, { mild: 0.4, moderate: 0.4, severe: 0.2 })
  assert.deepEqual(calmer.map((r) => r.direction), ['worse', 'neutral', 'worse'])
  const better = dayMix({ mild: 0.5, moderate: 0.4, severe: 0.1 }, { mild: 0.4, moderate: 0.4, severe: 0.2 })
  assert.deepEqual(better.map((r) => r.direction), ['better', 'flat', 'better'])
})

test('the gap is between the shares as they are written, so the figures add up on the page', () => {
  // 33.6 % and 25.4 % are written 34 % and 25 %: the gap is 9, not 8.
  const rows = dayMix({ mild: 0.336, moderate: 0.5, severe: 0.164 }, { mild: 0.254, moderate: 0.6, severe: 0.146 })
  assert.equal(rows[0]!.points, 9)
})

test('with no previous period there is nothing to compare with', () => {
  const rows = dayMix(now, null)
  assert.deepEqual(rows.map((r) => r.points), [undefined, undefined, undefined])
  assert.deepEqual(rows.map((r) => r.share), [0.34, 0.48, 0.17])
})
