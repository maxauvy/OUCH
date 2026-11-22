// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { daysWithOuch, loggedBy, newsItems, newsToOpen, thanksEligible, unreadNews, type NewsState } from '../src/lib/news.ts'

const days = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return { date: d.toISOString().slice(0, 10) }
  })

const base: NewsState = { hasOldZones: false, zonesNoticeSeen: false, thanksEligible: true, duoEligible: false, seen: [] }

test('the word of thanks goes to people with 7 days logged by the cutoff', () => {
  assert.equal(thanksEligible(days('2026-11-01', 7), '2026-11-20'), true)
  assert.equal(thanksEligible(days('2026-11-01', 6), '2026-11-20'), false)
  // Someone who starts after the word came out does not get it, however long they log.
  assert.equal(thanksEligible(days('2026-11-21', 30), '2026-11-20'), false)
  assert.equal(thanksEligible(days('2026-11-16', 30), '2026-11-20'), false)
})

test('days with OUCH count from the first logged day, that day included', () => {
  assert.equal(daysWithOuch([{ date: '2026-11-19' }, { date: '2026-10-09' }], '2026-11-19'), 42)
  assert.equal(daysWithOuch([{ date: '2026-11-19' }], '2026-11-19'), 1)
  assert.equal(daysWithOuch([], '2026-11-19'), 0)
})

test('the sheet lists the word of thanks first, then the zones notice; thanks only when eligible', () => {
  assert.deepEqual(newsItems(base), ['duo', 'thanks', 'zones'])
  assert.deepEqual(newsItems({ ...base, thanksEligible: false }), ['duo', 'zones'])
})

test('the zones notice is unread only for a journal with old zones that has not seen it', () => {
  assert.deepEqual(unreadNews(base), ['thanks'])
  assert.deepEqual(unreadNews({ ...base, hasOldZones: true }), ['thanks', 'zones'])
  assert.deepEqual(unreadNews({ ...base, hasOldZones: true, zonesNoticeSeen: true }), ['thanks'])
  assert.deepEqual(unreadNews({ ...base, seen: ['thanks'] }), [])
})

test('one item opens on its own: the oldest unread, never on a quiet day', () => {
  assert.equal(newsToOpen(base, false), 'thanks')
  assert.equal(newsToOpen({ ...base, hasOldZones: true }, false), 'zones')
  assert.equal(newsToOpen(base, true), null)
  assert.equal(newsToOpen({ ...base, seen: ['thanks'] }, false), null)
  assert.equal(newsToOpen({ ...base, thanksEligible: false }, false), null)
})

test('the word about Duo is news for people there by the day it opened, listed for everyone', () => {
  assert.equal(loggedBy([{ date: '2026-11-22' }], '2026-11-22'), true)
  assert.equal(loggedBy([{ date: '2026-11-23' }], '2026-11-22'), false)
  assert.equal(loggedBy([], '2026-11-22'), false)
  // Someone who starts later finds it in the list, without a dot, and it does not open on its own.
  assert.deepEqual(unreadNews({ ...base, thanksEligible: false }), [])
  assert.equal(newsToOpen({ ...base, thanksEligible: false }, false), null)
  // Someone already there: unread, and it opens once, after the older word of thanks.
  const there = { ...base, duoEligible: true }
  assert.deepEqual(unreadNews(there), ['duo', 'thanks'])
  assert.equal(newsToOpen(there, false), 'thanks')
  assert.equal(newsToOpen({ ...there, seen: ['thanks'] }, false), 'duo')
  assert.equal(newsToOpen({ ...there, seen: ['thanks', 'duo'] }, false), null)
  assert.equal(newsToOpen(there, true), null)
})
