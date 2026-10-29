// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NO_LEADS_SEEN, remember, trendsDot, trialToRepeat, type LeadsSeen } from '../src/lib/leadHints.ts'
import type { LoggedEntry } from '../src/db/types.ts'
import type { Lead } from '../src/lib/leads.ts'
import type { LeadTrial } from '../src/lib/leadTrial.ts'

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

const past: LeadTrial = { key: 'action:chaleur', action: 'Chaleur', start: '2026-08-01', end: '2026-08-07' }
const noted = (date: string, actions: string[] = ['chaleur']) => ({ date, painLevel: 4, positiveActions: actions }) as LoggedEntry
const repeatBase = {
  history: [past] as LeadTrial[] | undefined,
  current: undefined as LeadTrial | undefined,
  seen: undefined as LeadsSeen | undefined,
  entries: [noted('2026-10-05')],
  today: '2026-10-12',
  enabled: true,
  quiet: false,
}

test('a closed trial is offered again eight weeks after it ended, when the action is still in the notes', () => {
  assert.equal(trialToRepeat({ ...repeatBase, today: '2026-09-30' }), null)
  assert.equal(trialToRepeat({ ...repeatBase, today: '2026-10-02', entries: [noted('2026-10-01')] })?.key, 'action:chaleur')
  assert.equal(trialToRepeat(repeatBase)?.key, 'action:chaleur')
})

test('nothing is offered again for an action no longer noted, in a flare, with a trial under way, or when it is off', () => {
  assert.equal(trialToRepeat({ ...repeatBase, entries: [noted('2026-08-20')] }), null)
  assert.equal(trialToRepeat({ ...repeatBase, entries: [noted('2026-10-05', ['yoga'])] }), null)
  assert.equal(trialToRepeat({ ...repeatBase, quiet: true }), null)
  assert.equal(trialToRepeat({ ...repeatBase, current: { ...past, start: '2026-10-10', end: '2026-10-16' } }), null)
  assert.equal(trialToRepeat({ ...repeatBase, enabled: false }), null)
  assert.equal(trialToRepeat({ ...repeatBase, history: undefined }), null)
})

test('the action is matched like a lead: spelling and case do not matter', () => {
  assert.equal(trialToRepeat({ ...repeatBase, entries: [noted('2026-10-05', [' CHALEUR '])] })?.key, 'action:chaleur')
})

test('an offer taken up waits eight weeks before the next one', () => {
  const shown = { ...NO_LEADS_SEEN, repeatShown: { 'action:chaleur': '2026-10-12' } }
  assert.equal(trialToRepeat({ ...repeatBase, today: '2026-10-13', seen: shown, entries: [noted('2026-10-12')] }), null)
  assert.equal(trialToRepeat({ ...repeatBase, today: '2026-12-07', seen: shown, entries: [noted('2026-12-05')] })?.key, 'action:chaleur')
})

test('the newest week of an action counts, and the one tried longest ago comes first', () => {
  const again: LeadTrial = { ...past, start: '2026-09-01', end: '2026-09-07' }
  const yoga: LeadTrial = { key: 'action:yoga', action: 'Yoga', start: '2026-07-01', end: '2026-07-07' }
  assert.equal(trialToRepeat({ ...repeatBase, history: [past, again] }), null)
  const both = { ...repeatBase, history: [past, yoga], entries: [noted('2026-10-05', ['chaleur', 'yoga'])] }
  assert.equal(trialToRepeat(both)?.key, 'action:yoga')
})
