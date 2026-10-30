// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Lead } from '../src/lib/leads.ts'
import type { FlareEpisode } from '../src/lib/flares.ts'
import type { LeadTrial } from '../src/lib/leadTrial.ts'
import { isAway, LATER_DAYS, markDone, postpone, recentReturn, todayMessages, type TodayMessagesInput } from '../src/lib/todayMessages.ts'
import { shiftISO } from '../src/lib/dates.ts'

const TODAY = '2026-10-29'

const lead = (key: string): Lead => ({ key, kind: key.startsWith('action:') ? 'action' : 'sleep', high: { mean: 4, n: 6 }, low: { mean: 6, n: 6 }, rho: -0.5, days: 20, gap: -2 })
const trial = (key = 'action:marche'): LeadTrial => ({ key, action: 'Marche', start: '2026-10-25', end: '2026-10-31' })

const base: TodayMessagesInput = {
  today: TODAY,
  quiet: false,
  later: undefined,
  allow: { leads: true, weekly: true, trials: true, calm: true, month: true },
  leads: [],
  leadChoices: undefined,
  tried: [],
  weekly: null,
  repeat: null,
  invite: false,
  calm: null,
  month: null,
  trial: undefined,
}
const kinds = (r: { items: { key: string }[] }) => r.items.map((i) => i.key)

test('nothing waiting: no items and no count', () => {
  assert.deepEqual(todayMessages(base), { items: [], count: 0 })
})

test('a hard day brings nothing, whatever is waiting', () => {
  const r = todayMessages({ ...base, quiet: true, leads: [lead('sleep')], invite: true, trial: trial(), weekly: { kind: 'sleep' } })
  assert.deepEqual(r, { items: [], count: 0 })
})

test('the sheet lists the Sunday sentence, then the leads, a trial to repeat, the invitation, and the trial under way last', () => {
  const r = todayMessages({
    ...base,
    weekly: { kind: 'sleep' },
    leads: [lead('sleep'), lead('action:bain')],
    repeat: trial('action:etirements'),
    invite: true,
    trial: trial(),
  })
  assert.deepEqual(kinds(r), [`weekly:${TODAY}`, 'lead:sleep', 'lead:action:bain', 'repeat:action:etirements:2026-10-31', 'invite', 'trial'])
  assert.equal(r.count, 5)
})

test('a trial under way is listed but not counted, and alone it is not a count', () => {
  const r = todayMessages({ ...base, trial: trial() })
  assert.deepEqual(kinds(r), ['trial'])
  assert.equal(r.count, 0)
})

test('a lead already answered, or under trial, is not brought again', () => {
  const r = todayMessages({
    ...base,
    leads: [lead('sleep'), lead('stress'), lead('action:marche')],
    leadChoices: { sleep: { choice: 'kept', at: 1, gap: -2, days: 20 } },
    tried: ['action:marche'],
  })
  assert.deepEqual(kinds(r), ['lead:stress'])
})

test('suggestions switched off stay out, a trial under way stays', () => {
  const r = todayMessages({ ...base, allow: { leads: false, weekly: false, trials: false, calm: false, month: false }, leads: [lead('sleep')], weekly: { kind: 'sleep' }, repeat: trial(), trial: trial() })
  assert.deepEqual(kinds(r), ['trial'])
})

test('"later" puts a message away for 7 days, then it is back', () => {
  const later = postpone(undefined, 'lead:sleep', TODAY)
  assert.equal(later['lead:sleep'].until, shiftISO(TODAY, LATER_DAYS))
  const input = { ...base, leads: [lead('sleep')], later }
  assert.deepEqual(todayMessages(input).items, [])
  assert.deepEqual(todayMessages({ ...input, today: shiftISO(TODAY, LATER_DAYS - 1) }).items, [])
  assert.deepEqual(kinds(todayMessages({ ...input, today: shiftISO(TODAY, LATER_DAYS) })), ['lead:sleep'])
})

test('the second "later" is the last: the message does not come back on the day\'s page', () => {
  const second = postpone(postpone(undefined, 'invite', TODAY), 'invite', shiftISO(TODAY, LATER_DAYS))
  assert.equal(second.invite.count, 2)
  assert.equal(isAway(second.invite, shiftISO(TODAY, 365)), true)
})

test('a message acted on does not come back, and the others are untouched', () => {
  const later = markDone(postpone(undefined, 'lead:stress', TODAY), 'lead:sleep')
  assert.equal(isAway(later['lead:sleep'], TODAY), true)
  assert.equal(isAway(later['lead:sleep'], shiftISO(TODAY, 400)), true)
  assert.equal(later['lead:stress'].count, 1)
  assert.deepEqual(kinds(todayMessages({ ...base, leads: [lead('sleep'), lead('action:bain')], later })), ['lead:action:bain'])
})

test('opening the sheet consumes nothing: the same input gives the same list', () => {
  const input = { ...base, leads: [lead('sleep')], invite: true }
  assert.deepEqual(todayMessages(input), todayMessages(input))
})

test('the Sunday sentence is a new message each Sunday', () => {
  const later = postpone(undefined, `weekly:${TODAY}`, TODAY)
  const nextSunday = shiftISO(TODAY, 7)
  assert.deepEqual(todayMessages({ ...base, weekly: { kind: 'sleep' }, later }).items, [])
  assert.deepEqual(kinds(todayMessages({ ...base, today: nextSunday, weekly: { kind: 'sleep' }, later })), [`weekly:${nextSunday}`])
})

test('the map of answers does not grow for ever', () => {
  let later = undefined as ReturnType<typeof postpone> | undefined
  for (let i = 0; i < 80; i++) later = postpone(later, `lead:k${i}`, TODAY)
  assert.equal(Object.keys(later!).length, 60)
  assert.ok('lead:k79' in later!)
  assert.ok(!('lead:k0' in later!))
})

const episode = (end: string, over: Partial<FlareEpisode> = {}): FlareEpisode => ({ start: '2026-10-18', end, days: 5, peak: 8, baseline: 3, recoveryDays: 2, ongoing: false, endUnknown: false, ...over })

test('a flare that just ended, with a known way back, is recognised once, then it is done', () => {
  const calm = recentReturn([episode('2026-10-24')], TODAY)
  assert.equal(calm?.end, '2026-10-24')
  const r = todayMessages({ ...base, calm })
  assert.deepEqual(kinds(r), ['calm:2026-10-18'])
  assert.equal(r.count, 1)
  assert.deepEqual(kinds(todayMessages({ ...base, calm, later: markDone(undefined, 'calm:2026-10-18') })), [])
})

test('no word for a flare that is going on, whose end is unknown, too old, or without a way back', () => {
  for (const e of [episode('2026-10-28', { ongoing: true }), episode('2026-10-24', { endUnknown: true }), episode('2026-10-10'), episode('2026-10-24', { recoveryDays: null }), episode('2026-10-24', { recoveryDays: 0 })]) {
    assert.equal(recentReturn([e], TODAY), null)
  }
})

test('the word of calm is not brought when suggestions are off, nor on a hard day', () => {
  const calm = episode('2026-10-24')
  assert.deepEqual(kinds(todayMessages({ ...base, calm, allow: { ...base.allow, calm: false, month: false } })), [])
  assert.deepEqual(kinds(todayMessages({ ...base, calm, quiet: true })), [])
})

test('the summary of the month is listed once, away when thanked, and not brought when suggestions are off or on a hard day', () => {
  const month = { month: '2026-09', first: '2026-09-01', last: '2026-09-30', trials: 2, softestWeek: null, back: { flares: 1, days: 2 } }
  assert.deepEqual(kinds(todayMessages({ ...base, month })), ['month:2026-09'])
  assert.deepEqual(kinds(todayMessages({ ...base, month, later: markDone(undefined, 'month:2026-09') })), [])
  assert.deepEqual(kinds(todayMessages({ ...base, month, allow: { ...base.allow, month: false } })), [])
  assert.deepEqual(kinds(todayMessages({ ...base, month, quiet: true })), [])
})
