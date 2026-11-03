// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endMarked, MAX_MARKED, markedDaySet, markedOverlapping, ongoingMarked, removeMarked, removeOngoing, resolveMarked, startMarked } from '../src/lib/markedFlares.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'

const TODAY = '2026-11-10'
const shift = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

test('a period without an end is open for two weeks, the day it began included', () => {
  assert.equal(resolveMarked({ start: '2026-11-08', factors: [] }, TODAY).ongoing, true)
  assert.equal(resolveMarked({ start: '2026-11-08', factors: [] }, TODAY).days, 3)
  assert.equal(resolveMarked({ start: '2026-10-28', factors: [] }, '2026-11-10').ongoing, true)
  const old = resolveMarked({ start: '2026-10-27', factors: [] }, '2026-11-10')
  assert.equal(old.ongoing, false)
  assert.equal(old.last, '2026-11-09')
  assert.equal(old.days, 14)
})

test('a closed period ends where the person said', () => {
  const r = resolveMarked({ start: '2026-11-01', end: '2026-11-04', factors: [] }, TODAY)
  assert.deepEqual([r.ongoing, r.last, r.days], [false, '2026-11-04', 4])
})

test('starting one: factors kept in the app order, the note cleaned, newest first', () => {
  const list = startMarked([{ start: '2026-10-01', end: '2026-10-03', factors: [] }], { start: '2026-11-09', factors: ['stress', 'x', 'sleep'], note: '  mauvaise   nuit ' }, TODAY)
  assert.deepEqual(list.map((f) => f.start), ['2026-11-09', '2026-10-01'])
  assert.deepEqual(list[0], { start: '2026-11-09', factors: ['sleep', 'stress'], note: 'mauvaise nuit' })
})

test('nothing starts in the future, nor while one is open, nor past the cap', () => {
  assert.deepEqual(startMarked([], { start: '2026-11-11', factors: [] }, TODAY), [])
  const open = [{ start: '2026-11-09', factors: [] }]
  assert.equal(startMarked(open, { start: '2026-11-10', factors: [] }, TODAY).length, 1)
  const full = Array.from({ length: MAX_MARKED }, (_, i) => ({ start: shift('2025-01-01', i), end: shift('2025-01-01', i), factors: [] as never[] }))
  assert.equal(startMarked(full, { start: '2026-11-09', factors: [] }, TODAY).length, MAX_MARKED)
})

test('ending closes the open one today; removing it drops it; a closed one is left alone', () => {
  const list = [{ start: '2026-11-08', factors: [] }, { start: '2026-10-01', end: '2026-10-03', factors: [] }]
  assert.equal(ongoingMarked(list, TODAY)?.start, '2026-11-08')
  assert.equal(endMarked(list, TODAY)[0]!.end, TODAY)
  assert.equal(ongoingMarked(endMarked(list, TODAY), TODAY), null)
  assert.deepEqual(removeOngoing(list, TODAY), [list[1]])
  assert.deepEqual(removeMarked(list, '2026-10-01'), [list[0]])
})

test('the days of the periods, and the periods that touch a range', () => {
  const list = [{ start: '2026-11-08', factors: [] }, { start: '2026-10-01', end: '2026-10-03', factors: [] }]
  assert.deepEqual([...markedDaySet(list, TODAY)].sort(), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-08', '2026-11-09', '2026-11-10'])
  assert.deepEqual(markedOverlapping(list, '2026-10-02', '2026-10-20', TODAY).map((r) => r.start), ['2026-10-01'])
})

test('a backup brings the periods back clean and ignores what is not valid', () => {
  const s = sanitizeSettings({
    markedFlares: [
      { start: '2026-11-08', factors: ['stress', 'nope', 'sleep'], note: ' x ', evil: 1 },
      { start: '2026-10-01', end: '2026-09-01', factors: [] },
      { start: 'bad', factors: [] },
      { start: '2026-10-05', end: '2026-10-07' },
    ],
  })
  assert.deepEqual(s?.markedFlares, [
    { start: '2026-11-08', factors: ['sleep', 'stress'], note: 'x' },
    { start: '2026-10-05', end: '2026-10-07', factors: [] },
  ])
  assert.equal(sanitizeSettings({ markedFlares: 'x' })?.markedFlares, undefined)
})
