// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/dates.ts'
import { DEFAULT_MINUTES, MAX_GESTURES, MAX_MINUTES, MIN_MINUTES, cleanGestures, gestureRows, notedActions, stepMinutes, timerState, toggleGesture } from '../src/lib/gestures.ts'

const today = '2026-11-12'
const day = (back: number, actions: string[]): DailyEntry => ({ date: shiftISO(today, -back), painLevel: 4, positiveActions: actions, createdAt: 0, updatedAt: 0 }) as DailyEntry

test('what was noted comes most often first, a slip of the keyboard is left out, and the window is 90 days', () => {
  const entries = [day(1, ['Bain chaud', 'Marche']), day(2, ['bain chaud']), day(3, ['Bain chaud', 'Marche']), day(4, ['Marche']), day(5, ['Oups']), day(120, ['Vieux', 'Vieux'])]
  assert.deepEqual(notedActions(entries, today), [{ label: 'Bain chaud', days: 3 }, { label: 'Marche', days: 3 }])
})

test('the gestures kept are cleaned: names tidied, no repeat, five at most, a time within the limits', () => {
  const kept = cleanGestures([{ name: ' Chaleur  douce ', minutes: 15 }, { name: 'chaleur douce', minutes: 20 }, { name: '', minutes: 5 }, { name: 'Marche', minutes: 999 }, { name: 'Froid', minutes: 'x' }, 7, null])
  assert.deepEqual(kept, [{ name: 'Chaleur douce', minutes: 15 }, { name: 'Marche', minutes: MAX_MINUTES }, { name: 'Froid', minutes: DEFAULT_MINUTES }])
  assert.equal(cleanGestures('nope'), undefined)
  assert.equal(cleanGestures([]), undefined)
  assert.equal(cleanGestures(Array.from({ length: 9 }, (_, i) => ({ name: `g${i}`, minutes: 10 })))?.length, MAX_GESTURES)
})

test('keeping and letting go, with a short list and a time moved by steps', () => {
  let kept = toggleGesture([], 'Bain chaud')
  assert.deepEqual(kept, [{ name: 'Bain chaud', minutes: DEFAULT_MINUTES }])
  kept = stepMinutes(kept, 'bain chaud', 1)
  assert.equal(kept[0]?.minutes, DEFAULT_MINUTES + 5)
  assert.equal(stepMinutes([{ name: 'a', minutes: MIN_MINUTES }], 'a', -1)[0]?.minutes, MIN_MINUTES)
  assert.deepEqual(toggleGesture(kept, 'BAIN CHAUD'), [])
  const full = Array.from({ length: MAX_GESTURES }, (_, i) => ({ name: `g${i}`, minutes: 10 }))
  assert.equal(toggleGesture(full, 'une de plus').length, MAX_GESTURES)
})

test('the rows list what is kept first, then what was noted and not kept', () => {
  const rows = gestureRows([{ name: 'Marche', minutes: 10 }], [{ label: 'Bain chaud', days: 5 }, { label: 'marche', days: 4 }])
  assert.deepEqual(rows, [{ name: 'Marche', minutes: 10, days: 4 }, { name: 'Bain chaud', days: 5 }])
})

test('the timer says what is left, how far it is, and when it is over', () => {
  assert.deepEqual(timerState(0, 0, 10), { leftMs: 600_000, fraction: 0, done: false })
  assert.deepEqual(timerState(0, 300_000, 10), { leftMs: 300_000, fraction: 0.5, done: false })
  assert.deepEqual(timerState(0, 600_000, 10), { leftMs: 0, fraction: 1, done: true })
  assert.equal(timerState(1000, 0, 5).leftMs, 300_000)
})
