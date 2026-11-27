// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import { INVITE_DAYS, MAX_NOTE, cleanNote, flareSpan, noteDate, noteFromBackup, noteInvite, pastFlareLengths } from '../src/lib/goodDayNote.ts'
import { hardDaysCard } from '../src/lib/hardDays.ts'
import { detectFlares } from '../src/lib/flares.ts'
import { shiftISO } from '../src/lib/dates.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (date: string, painLevel: number): LoggedEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0 })

/** Usual pain (4) on days 0–13, then `values` from day 14. */
function series(values: number[]): LoggedEntry[] {
  return [...Array.from({ length: 14 }, (_, i) => entry(day(i), 4)), ...values.map((v, i) => entry(day(14 + i), v))]
}
const calm = (n: number) => Array<number>(n).fill(4)
// Two flares (3 then 5 days) with calm weeks around them.
const TWO = [7, 8, 7, ...calm(14), 7, 8, 8, 7, 7, ...calm(4)]

test('a note is tidied and dated; an emptied one leaves nothing', () => {
  assert.deepEqual(cleanNote('  Tu as le droit.\r\nBain chaud.  ', day(0)), { text: 'Tu as le droit.\nBain chaud.', date: day(0) })
  assert.equal(cleanNote('   ', day(0)), undefined)
  assert.equal(cleanNote(42, day(0)), undefined)
  assert.equal(cleanNote('a'.repeat(MAX_NOTE + 20), day(0))?.text.length, MAX_NOTE)
})

test('a note from a backup needs a string and a real day', () => {
  assert.deepEqual(noteFromBackup({ text: 'Doucement', date: '2026-10-12', extra: 1 }), { text: 'Doucement', date: '2026-10-12' })
  assert.equal(noteFromBackup({ text: 'Doucement', date: '2026-02-30' }), undefined)
  // A month or a day out of range used to throw (Invalid time value) and fail the whole import.
  assert.equal(noteFromBackup({ text: 'Doucement', date: '2023-13-45' }), undefined)
  assert.equal(noteFromBackup({ text: ['x'], date: '2026-10-12' }), undefined)
  assert.equal(noteFromBackup('Doucement'), undefined)
  assert.equal(noteFromBackup([{ text: 'x', date: '2026-10-12' }]), undefined)
})

test('the sentence needs two flares that ended, and gives the shortest and the longest', () => {
  assert.equal(flareSpan([]), null)
  assert.equal(flareSpan([6]), null)
  assert.deepEqual(flareSpan([16, 3, 10, 6]), { count: 4, shortest: 3, longest: 16 })
})

test('only flares that ended with a known end are counted', () => {
  const episodes = detectFlares(series(TWO))
  assert.deepEqual(pastFlareLengths(episodes), [3, 5])
  assert.deepEqual(pastFlareLengths(episodes.map((e, i) => (i === 0 ? { ...e, endUnknown: true } : e))), [5])
  assert.deepEqual(pastFlareLengths(episodes.map((e) => ({ ...e, ongoing: true }))), [])
})

test('the soft card carries the earlier flares, not the one under way', () => {
  const entries = series([...TWO, 7, 8, 7])
  const card = hardDaysCard({ entries, today: day(14 + TWO.length + 3) })
  assert.ok(card)
  assert.deepEqual(card.past, [3, 5])
})

test('the invitation comes once a flare has ended, then not when answered, written or too old', () => {
  const entries = series(TWO)
  const today = day(14 + TWO.length)
  const flare = noteInvite({ entries, today })
  assert.equal(flare?.start, day(31))
  assert.equal(noteInvite({ entries, today, answered: day(31) }), null)
  assert.equal(noteInvite({ entries, today, note: { text: 'x', date: day(0) } }), null)
  assert.equal(noteInvite({ entries, today, enabled: false }), null)
  assert.equal(noteInvite({ entries, today: shiftISO(flare!.end, INVITE_DAYS + 1) }), null)
})

test('no invitation while a flare is under way, nor before any flare', () => {
  assert.equal(noteInvite({ entries: series([7, 8, 7, 8]), today: day(18) }), null)
  assert.equal(noteInvite({ entries: series(calm(10)), today: day(24) }), null)
})

test('the date of the note has the year only when it is not this one', () => {
  assert.equal(noteDate('2026-10-12', 'fr-FR', '2026-11-24'), '12 octobre')
  assert.equal(noteDate('2025-10-12', 'fr-FR', '2026-11-24'), '12 octobre 2025')
})
