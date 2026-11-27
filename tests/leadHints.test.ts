// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NO_LEADS_SEEN, remember, trendsDot } from '../src/lib/leadHints.ts'
import type { Lead } from '../src/lib/leads.ts'

const lead = (key: string): Lead => ({ key, kind: 'sleep', high: { mean: 3, n: 10 }, low: { mean: 5, n: 10 }, rho: -0.6, days: 30, gap: -2 })
const shown = [lead('sleep'), lead('stress')]

test('the dot shows for a lead Trends has not shown yet, and only when it is on', () => {
  assert.equal(trendsDot({ shown, seen: undefined, enabled: true }), true)
  assert.equal(trendsDot({ shown, seen: { ...NO_LEADS_SEEN, trends: ['sleep', 'stress'] }, enabled: true }), false)
  assert.equal(trendsDot({ shown, seen: { ...NO_LEADS_SEEN, trends: ['sleep'] }, enabled: true }), true)
  assert.equal(trendsDot({ shown, seen: undefined, enabled: false }), false)
  assert.equal(trendsDot({ shown: [], seen: undefined, enabled: true }), false)
})

test('a lead the list has brought, or had set aside, does not light the dot', () => {
  assert.equal(trendsDot({ shown, seen: undefined, enabled: true, announced: ['sleep', 'stress'] }), false)
  assert.equal(trendsDot({ shown, seen: undefined, enabled: true, announced: ['sleep'] }), true)
})

test('what was shown is remembered without repeats, and capped', () => {
  assert.deepEqual(remember(['a', 'b'], ['b', 'c']), ['a', 'b', 'c'])
  assert.equal(remember(Array.from({ length: 70 }, (_, i) => `k${i}`), ['new']).length, 60)
  assert.equal(remember(Array.from({ length: 70 }, (_, i) => `k${i}`), ['new']).at(-1), 'new')
})
