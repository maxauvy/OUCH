// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import {
  LEAD_MAX,
  arrangeLeads,
  choiceFor,
  findLeads,
  isDismissed,
  leadThreshold,
  type Lead,
  type LeadChoices,
} from '../src/lib/leads.ts'
import { shiftISO } from '../src/lib/medications.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (n: number, painLevel: number, extra: Partial<LoggedEntry> = {}): LoggedEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Sleep quality cycles through 0–9 and pain mirrors it: as clear as it gets. */
const sleepMirror = (n: number) => range(n).map((i) => entry(i, 9 - ((i * 7) % 10), { sleepQuality: (i * 7) % 10 }))

test('the bar is the weak mark of the report, then twice what chance gives', () => {
  assert.equal(leadThreshold(100), 0.3)
  assert.ok(Math.abs(leadThreshold(14) - 2 / Math.sqrt(14)) < 1e-9)
  assert.ok(leadThreshold(14) > leadThreshold(40))
})

test('better sleep with less pain is a lead, with pain lower on the high side', () => {
  const [lead] = findLeads(sleepMirror(30))
  assert.equal(lead.key, 'sleep')
  assert.equal(lead.kind, 'sleep')
  assert.ok(lead.gap < -3)
  assert.ok(lead.rho < -0.9)
  assert.equal(lead.days, 30)
  assert.ok(lead.high.mean < lead.low.mean)
})

test('with fewer than 14 days there is nothing to read yet', () => {
  assert.deepEqual(findLeads(sleepMirror(13)), [])
})

test('a pain that never moves, or a factor that never moves, is not a lead', () => {
  assert.deepEqual(findLeads(range(30).map((i) => entry(i, 5, { sleepQuality: (i * 7) % 10 }))), [])
  assert.deepEqual(findLeads(range(30).map((i) => entry(i, i % 10, { sleepQuality: 6 }))), [])
})

test('a gap under a point is not worth a card, even when the order agrees', () => {
  // pain 4 or 5 following the sleep order: the correlation is there, the means are under a point apart
  const entries = range(30).map((i) => {
    const sleep = (i * 7) % 10
    return entry(i, sleep < 5 && i % 3 !== 0 ? 5 : 4, { sleepQuality: sleep })
  })
  assert.deepEqual(findLeads(entries), [])
})

test('the factors the person does not track are left out', () => {
  assert.deepEqual(findLeads(sleepMirror(30), { sleep: false, stress: true, activity: true, actions: true }), [])
})

test('the activity read is the previous day’s', () => {
  const entries = range(30).map((i) => {
    const level = (i * 7) % 10
    return entry(i, 9 - ((((i - 1) * 7) % 10 + 10) % 10), { activityLevel: level })
  })
  const lead = findLeads(entries).find((l) => l.kind === 'activity')
  assert.ok(lead)
  assert.ok(lead.gap < 0)
})

test('an action is compared day by day, whatever its spelling', () => {
  const walked = new Set([1, 4, 6, 9, 12, 15, 18, 21, 24, 27])
  const entries = range(30).map((i) =>
    entry(i, walked.has(i) ? 3 : 6, walked.has(i) ? { positiveActions: [i % 2 ? 'Marche' : ' marche '] } : {})
  )
  const [lead] = findLeads(entries)
  assert.equal(lead.key, 'action:marche')
  assert.equal(lead.action, 'Marche')
  assert.equal(lead.high.n, 10)
  assert.equal(lead.low.n, 20)
  assert.equal(lead.gap, -3)
})

test('an action on only a few days does not make a lead', () => {
  const entries = range(30).map((i) => entry(i, i < 3 ? 2 : 6, i < 3 ? { positiveActions: ['Marche'] } : {}))
  assert.deepEqual(findLeads(entries), [])
})

test('the strongest lead comes first', () => {
  const entries = range(30).map((i) => {
    const sleep = (i * 7) % 10
    return entry(i, 9 - sleep, { sleepQuality: sleep, stressLevel: (i * 3) % 10 })
  })
  const keys = findLeads(entries).map((l) => l.key)
  assert.equal(keys[0], 'sleep')
})

const lead = (key: string, gap: number, days = 30, rho = -0.6): Lead => ({
  key,
  kind: 'action',
  action: key,
  high: { mean: 4, n: 10 },
  low: { mean: 4 - gap, n: 20 },
  rho,
  days,
  gap,
})

test('at most three leads are shown, the kept ones first', () => {
  const leads = [lead('a', -3, 30, -0.9), lead('b', -2, 30, -0.8), lead('c', -2, 30, -0.7), lead('d', -2, 30, -0.6)]
  const choices: LeadChoices = { d: choiceFor(leads[3], 'kept', 1) }
  const { shown, dismissed } = arrangeLeads(leads, choices)
  assert.equal(shown.length, LEAD_MAX)
  assert.deepEqual(shown.map((l) => l.key), ['d', 'a', 'b'])
  assert.deepEqual(dismissed, [])
})

test('a dismissed lead is set aside, not removed', () => {
  const leads = [lead('a', -2), lead('b', -2)]
  const { shown, dismissed } = arrangeLeads(leads, { a: choiceFor(leads[0], 'dismissed', 1) })
  assert.deepEqual(shown.map((l) => l.key), ['b'])
  assert.deepEqual(dismissed.map((l) => l.key), ['a'])
})

test('a dismissed lead comes back when it gets a point stronger, or has twice the days', () => {
  const was = choiceFor(lead('a', -2, 30), 'dismissed', 1)
  assert.equal(isDismissed(lead('a', -2.4, 40), was), true)
  assert.equal(isDismissed(lead('a', -3, 30), was), false)
  assert.equal(isDismissed(lead('a', -2, 60), was), false)
})

test('a dismissed lead comes back if it turns the other way', () => {
  const was = choiceFor(lead('a', -2), 'dismissed', 1)
  assert.equal(isDismissed(lead('a', 2), was), false)
})

test('a kept lead is never reported as dismissed', () => {
  assert.equal(isDismissed(lead('a', -2), choiceFor(lead('a', -2), 'kept', 1)), false)
  assert.equal(isDismissed(lead('a', -2), undefined), false)
})
