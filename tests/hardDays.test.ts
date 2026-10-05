// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { hardDaysCard, helpedDuring } from '../src/lib/hardDays.ts'
import { detectFlares } from '../src/lib/flares.ts'
import { shiftISO } from '../src/lib/medications.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (date: string, painLevel: number, positiveActions?: string[]): DailyEntry => ({
  date,
  painLevel,
  positiveActions,
  createdAt: 0,
  updatedAt: 0,
})

/** Usual pain (4) on days 0–13, then `values` from day 14 (null = not logged). */
function series(values: (number | null)[], actions: Record<number, string[]> = {}): DailyEntry[] {
  const out = Array.from({ length: 14 }, (_, i) => entry(day(i), 4))
  values.forEach((v, i) => v !== null && out.push(entry(day(14 + i), v, actions[14 + i])))
  return out
}

const HARD = [7, 8, 7] // days 14–16

test('the card shows on the day after a flare has become one', () => {
  const card = hardDaysCard({ entries: series(HARD), today: day(17) })
  assert.equal(card?.episode.start, day(14))
  assert.deepEqual(card?.helped, [])
})

test('it stays a day longer when yesterday was not logged, then goes', () => {
  assert.ok(hardDaysCard({ entries: series(HARD), today: day(18) }))
  assert.equal(hardDaysCard({ entries: series(HARD), today: day(19) }), null)
})

test('nothing shows before the flare is one, or when pain is back to usual', () => {
  assert.equal(hardDaysCard({ entries: series([7, 8]), today: day(16) }), null)
  assert.equal(hardDaysCard({ entries: series([7, 8, 7, 4, 4]), today: day(19) }), null)
})

test('what is logged today changes nothing', () => {
  const quiet = [...series(HARD), entry(day(17), 2)]
  assert.ok(hardDaysCard({ entries: quiet, today: day(17) }))
  assert.equal(hardDaysCard({ entries: series(HARD), today: day(17) })?.episode.start, day(14))
})

test('it can be switched off', () => {
  assert.equal(hardDaysCard({ entries: series(HARD), today: day(17), enabled: false }), null)
})

test('shown once per flare: that day yes, a later day no, dismissed no', () => {
  const entries = series([7, 8, 7, 8, 8])
  const seen = { start: day(14), date: day(17), dismissed: false }
  assert.ok(hardDaysCard({ entries, today: day(17), seen }))
  assert.equal(hardDaysCard({ entries, today: day(18), seen }), null)
  assert.equal(hardDaysCard({ entries, today: day(17), seen: { ...seen, dismissed: true } }), null)
})

test('a different flare is shown even if an earlier one was dismissed', () => {
  const entries = series(HARD)
  assert.ok(hardDaysCard({ entries, today: day(17), seen: { start: day(-30), date: day(-27), dismissed: true } }))
})

test('what helped is counted on flare days only, most frequent first', () => {
  const entries = series([7, 8, 7, 4, 4], {
    14: ['Bain chaud', 'Repos'],
    15: ['bain chaud ', 'Chaleur'],
    16: ['Marche courte', 'Bain chaud'],
    17: ['Méditation'], // after the flare
  })
  entries[0].positiveActions = ['Yoga'] // before it
  assert.deepEqual(helpedDuring(entries, detectFlares(entries)), ['Bain chaud', 'Repos', 'Chaleur'])
})

test('at most three ideas, ties keeping the order they first appeared in', () => {
  const entries = series(HARD, { 14: ['A', 'B', 'C'], 15: ['D'], 16: ['E'] })
  assert.deepEqual(helpedDuring(entries, detectFlares(entries)), ['A', 'B', 'C'])
})

test('the card carries what helped in earlier days of the flare', () => {
  const entries = series(HARD, { 14: ['Chaleur'], 16: ['Chaleur', 'Repos'] })
  assert.deepEqual(hardDaysCard({ entries, today: day(17) })?.helped, ['Chaleur', 'Repos'])
})
