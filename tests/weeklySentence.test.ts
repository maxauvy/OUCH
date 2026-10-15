// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import { isSunday, weeklyFinding } from '../src/lib/weeklySentence.ts'
import { shiftISO } from '../src/lib/medications.ts'

const SUNDAY = '2026-10-11'
const day = (n: number) => shiftISO(SUNDAY, n - 6) // n = 0..6, Monday to Sunday
const entry = (n: number, painLevel: number, extra: Partial<LoggedEntry> = {}): LoggedEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})

test('2026-10-11 is a Sunday, and the finding is only for Sundays', () => {
  assert.equal(isSunday(SUNDAY), true)
  assert.equal(isSunday('2026-10-10'), false)
  const week = [3, 2, 7, 8, 3, 7, 6].map((p, i) => entry(i, p, p <= 3 ? { positiveActions: ['Marche'] } : {}))
  assert.deepEqual(weeklyFinding(week, SUNDAY, false), { kind: 'action', action: 'Marche' })
  assert.equal(weeklyFinding(week, '2026-10-10', false), null)
})

test('the three gentlest days share an action that is rare on the others', () => {
  // "Bain chaud" is also on two of the other days, "marche" on one: the rarer one is said.
  const week = [2, 3, 7, 8, 3, 7, 6].map((p, i) =>
    entry(i, p, p <= 3 ? { positiveActions: [' marche', 'Bain chaud'] } : i === 3 ? { positiveActions: ['Marche', 'bain chaud'] } : i === 5 ? { positiveActions: ['Bain chaud'] } : {})
  )
  assert.deepEqual(weeklyFinding(week, SUNDAY, false), { kind: 'action', action: 'marche' })
})

test('an action that is on most of the other days says nothing', () => {
  const week = [2, 3, 7, 8, 3, 7, 6].map((p, i) => entry(i, p, { positiveActions: ['Marche'] }))
  assert.equal(weeklyFinding(week, SUNDAY, false), null)
})

test('it is silent during a flare', () => {
  const week = [3, 2, 7, 8, 3, 7, 6].map((p, i) => entry(i, p, p <= 3 ? { positiveActions: ['Marche'] } : {}))
  assert.equal(weeklyFinding(week, SUNDAY, true), null)
})

test('a tie for third place leaves it silent: the gentlest days are not clear', () => {
  const week = [2, 3, 4, 4, 7, 7, 8].map((p, i) => entry(i, p, p <= 4 && i < 3 ? { positiveActions: ['Marche'] } : {}))
  assert.equal(weeklyFinding(week, SUNDAY, false), null)
})

test('too few logged days leave it silent', () => {
  const week = [2, 3, 8, 9].map((p, i) => entry(i, p, { positiveActions: ['Marche'] }))
  assert.equal(weeklyFinding(week, SUNDAY, false), null)
})

test('good nights on the gentlest days, and not on the others, are a finding', () => {
  const week = [2, 3, 3, 8, 7, 7, 6].map((p, i) => entry(i, p, { sleepHours: p <= 3 ? 8 : 5.5 }))
  assert.deepEqual(weeklyFinding(week, SUNDAY, false), { kind: 'sleep' })
})
