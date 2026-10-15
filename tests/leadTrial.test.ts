// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import type { Lead } from '../src/lib/leads.ts'
import { continueTrial, startTrial, trialStatus, type LeadTrial } from '../src/lib/leadTrial.ts'
import { shiftISO } from '../src/lib/medications.ts'

const START = '2026-10-05'
const day = (n: number) => shiftISO(START, n)
const entry = (n: number, painLevel: number, actions?: string[]): LoggedEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  positiveActions: actions,
})
const lead = (kind: Lead['kind'], action?: string, gap = -1.5): Lead => ({
  key: kind === 'action' ? `action:${action?.toLowerCase()}` : kind,
  kind,
  action,
  high: { mean: 4, n: 10 },
  low: { mean: 4 - gap, n: 20 },
  rho: -0.5,
  days: 30,
  gap,
})
const trial: LeadTrial = { key: 'action:marche', action: 'Marche', start: START, end: day(6) }

test('only an action can be tried, for seven days from today', () => {
  assert.deepEqual(startTrial(lead('action', 'Marche'), START), trial)
  assert.equal(startTrial(lead('sleep'), START), null)
  assert.equal(startTrial(lead('stress'), START), null)
})

test('carrying on starts a new week from today, on the same action', () => {
  const next = continueTrial(trial, day(8))
  assert.equal(next.start, day(8))
  assert.equal(next.end, day(14))
  assert.equal(next.action, 'Marche')
})

test('during the week it counts the days with the action, and the days to come are not missing', () => {
  const entries = [entry(0, 4, ['marche']), entry(1, 6), entry(2, 3, [' MARCHE '])]
  const s = trialStatus(trial, entries, day(2))
  assert.equal(s.over, false)
  assert.equal(s.day, 3)
  assert.equal(s.withDays, 2)
  assert.deepEqual(s.days.map((d) => d.state), ['with', 'without', 'with', 'future', 'future', 'future', 'future'])
  assert.equal(s.result, null)
  assert.equal(s.tooFew, false)
})

test('a day without an entry in the week is simply not logged', () => {
  const s = trialStatus(trial, [entry(0, 4, ['Marche'])], day(3))
  assert.deepEqual(s.days.slice(0, 4).map((d) => d.state), ['with', 'unlogged', 'unlogged', 'unlogged'])
})

test('once the week is over, the days with it are set beside the others', () => {
  const entries = [entry(0, 3, ['Marche']), entry(1, 5), entry(2, 4, ['Marche']), entry(3, 6), entry(4, 5), entry(5, 4, ['Marche']), entry(6, 7)]
  const s = trialStatus(trial, entries, day(7), -2)
  assert.equal(s.over, true)
  assert.equal(s.day, 7)
  assert.ok(s.result)
  assert.equal(s.result.with.n, 3)
  assert.equal(s.result.without.n, 4)
  assert.equal(s.result.with.mean, 11 / 3)
  assert.equal(s.result.without.mean, 23 / 4)
  assert.ok(s.result.gap < 0)
  assert.equal(s.result.sameDirection, true)
})

test('it says when the week goes the other way from the lead, and nothing when there is no direction', () => {
  const entries = [entry(0, 7, ['Marche']), entry(1, 4), entry(2, 6, ['Marche']), entry(3, 3), entry(4, 4)]
  assert.equal(trialStatus(trial, entries, day(7), -2).result?.sameDirection, false)
  assert.equal(trialStatus(trial, entries, day(7)).result?.sameDirection, null)
})

test('with too few days of one sort there is nothing to compare', () => {
  const s = trialStatus(trial, [entry(0, 3, ['Marche']), entry(1, 5), entry(2, 6), entry(3, 6)], day(7))
  assert.equal(s.result, null)
  assert.equal(s.tooFew, true)
})

test('before the end it never says too few', () => {
  assert.equal(trialStatus(trial, [entry(0, 3)], day(3)).tooFew, false)
})
