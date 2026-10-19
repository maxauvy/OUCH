// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NO_LEADS_SEEN, leadToBring, remember, trendsDot, trialToRepeat, weeklyVisible, type LeadsSeen } from '../src/lib/leadHints.ts'
import type { LoggedEntry } from '../src/db/types.ts'
import type { Lead, LeadChoices } from '../src/lib/leads.ts'
import type { LeadTrial } from '../src/lib/leadTrial.ts'

const lead = (key: string): Lead => ({ key, kind: 'sleep', high: { mean: 3, n: 10 }, low: { mean: 5, n: 10 }, rho: -0.6, days: 30, gap: -2 })
const shown = [lead('sleep'), lead('stress')]
const base = { shown, choices: undefined as LeadChoices | undefined, seen: undefined as LeadsSeen | undefined, today: '2026-10-12', enabled: true, quiet: false }

test('the first lead not answered and not shown before is brought', () => {
  assert.equal(leadToBring(base)?.key, 'sleep')
  assert.equal(leadToBring({ ...base, seen: { ...NO_LEADS_SEEN, prompted: ['sleep'] } })?.key, 'stress')
  assert.equal(leadToBring({ ...base, choices: { sleep: { choice: 'kept', at: 1, gap: -2, days: 30 } } })?.key, 'stress')
})

test('a lead that is, or was, under trial is not brought, even when it is the one shown today', () => {
  assert.equal(leadToBring({ ...base, tried: ['sleep'] })?.key, 'stress')
  assert.equal(leadToBring({ ...base, tried: ['sleep', 'stress'] }), null)
  const open = { ...NO_LEADS_SEEN, prompted: ['sleep'], today: { date: '2026-10-12', key: 'sleep', dismissed: false } }
  assert.equal(leadToBring({ ...base, seen: open, tried: ['sleep'] }), null)
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

test('an offer shown waits eight weeks before the next one, and stays on the day until it is closed', () => {
  const shown = { ...NO_LEADS_SEEN, repeatShown: { 'action:chaleur': '2026-10-12' } }
  assert.equal(trialToRepeat({ ...repeatBase, seen: { ...shown, repeat: { date: '2026-10-12', key: 'action:chaleur', dismissed: false } } })?.key, 'action:chaleur')
  assert.equal(trialToRepeat({ ...repeatBase, seen: { ...shown, repeat: { date: '2026-10-12', key: 'action:chaleur', dismissed: true } } }), null)
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
