// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NO_LEADS_SEEN, leadToBring, remember, trendsDot, weeklyVisible, type LeadsSeen } from '../src/lib/leadHints.ts'
import type { Lead, LeadChoices } from '../src/lib/leads.ts'

const lead = (key: string): Lead => ({ key, kind: 'sleep', high: { mean: 3, n: 10 }, low: { mean: 5, n: 10 }, rho: -0.6, days: 30, gap: -2 })
const shown = [lead('sleep'), lead('stress')]
const base = { shown, choices: undefined as LeadChoices | undefined, seen: undefined as LeadsSeen | undefined, today: '2026-10-12', enabled: true, quiet: false }

test('the first lead not answered and not shown before is brought', () => {
  assert.equal(leadToBring(base)?.key, 'sleep')
  assert.equal(leadToBring({ ...base, seen: { ...NO_LEADS_SEEN, prompted: ['sleep'] } })?.key, 'stress')
  assert.equal(leadToBring({ ...base, choices: { sleep: { choice: 'kept', at: 1, gap: -2, days: 30 } } })?.key, 'stress')
})

test('nothing is brought when it is switched off, or while it is quiet', () => {
  assert.equal(leadToBring({ ...base, enabled: false }), null)
  assert.equal(leadToBring({ ...base, quiet: true }), null)
})

test('the one shown today stays until it is closed, and then nothing comes the same day', () => {
  const open = { ...NO_LEADS_SEEN, prompted: ['sleep'], today: { date: '2026-10-12', key: 'sleep', dismissed: false } }
  assert.equal(leadToBring({ ...base, seen: open })?.key, 'sleep')
  assert.equal(leadToBring({ ...base, seen: { ...open, today: { ...open.today, dismissed: true } } }), null)
})

test('the next day brings the next lead, not the one already shown', () => {
  const old = { ...NO_LEADS_SEEN, prompted: ['sleep'], today: { date: '2026-10-11', key: 'sleep', dismissed: true } }
  assert.equal(leadToBring({ ...base, seen: old })?.key, 'stress')
})

test('the dot shows for a lead Trends has not shown yet, and only when it is on', () => {
  assert.equal(trendsDot({ shown, seen: undefined, enabled: true }), true)
  assert.equal(trendsDot({ shown, seen: { ...NO_LEADS_SEEN, trends: ['sleep', 'stress'] }, enabled: true }), false)
  assert.equal(trendsDot({ shown, seen: { ...NO_LEADS_SEEN, trends: ['sleep'] }, enabled: true }), true)
  assert.equal(trendsDot({ shown, seen: undefined, enabled: false }), false)
  assert.equal(trendsDot({ shown: [], seen: undefined, enabled: true }), false)
})

test('the Sunday sentence is hidden once it is closed that day', () => {
  assert.equal(weeklyVisible(undefined, '2026-10-11'), true)
  assert.equal(weeklyVisible({ ...NO_LEADS_SEEN, weekly: { date: '2026-10-11', dismissed: true } }, '2026-10-11'), false)
  assert.equal(weeklyVisible({ ...NO_LEADS_SEEN, weekly: { date: '2026-10-04', dismissed: true } }, '2026-10-11'), true)
})

test('what was shown is remembered without repeats, and capped', () => {
  assert.deepEqual(remember(['a', 'b'], ['b', 'c']), ['a', 'b', 'c'])
  assert.equal(remember(Array.from({ length: 70 }, (_, i) => `k${i}`), ['new']).length, 60)
  assert.equal(remember(Array.from({ length: 70 }, (_, i) => `k${i}`), ['new']).at(-1), 'new')
})
