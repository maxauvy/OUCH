// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import { sharedFlare, sharedFlareKey } from '../src/lib/sharedFlare.ts'
import { shiftISO } from '../src/lib/dates.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (date: string, painLevel: number): LoggedEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0 })

/** Usual pain (3) on days 0–13, then `values` from day 14 (null = not logged). */
function series(values: (number | null)[]): LoggedEntry[] {
  const out = Array.from({ length: 14 }, (_, i) => entry(day(i), 3))
  values.forEach((v, i) => v !== null && out.push(entry(day(14 + i), v)))
  return out
}

test('nothing before a flare is one: two hard days are not enough', () => {
  assert.equal(sharedFlare(series([7, 8]), day(16)), null)
  assert.equal(sharedFlare(series([]), day(14)), null)
})

test('from the day after the third hard day: since when, and which day it is', () => {
  assert.deepEqual(sharedFlare(series([7, 8, 7]), day(17)), { kind: 'harder', start: day(14), day: 4 })
  assert.deepEqual(sharedFlare(series([7, 8, 7, 8]), day(18)), { kind: 'harder', start: day(14), day: 5 })
})

test('the day itself does not count: logging it neither adds nor removes the line', () => {
  const entries = series([7, 8, 7])
  assert.deepEqual(sharedFlare([...entries, entry(day(17), 2)], day(17)), sharedFlare(entries, day(17)))
})

test('« Ça s’apaise » once, on the day after the first calm day', () => {
  const entries = series([7, 8, 7, 8, 3])
  assert.deepEqual(sharedFlare(entries, day(19)), { kind: 'easing', start: day(14), end: day(17), since: day(18) })
  // The next day, with day 19 noted, the image is back to usual.
  assert.equal(sharedFlare([...entries, entry(day(19), 3)], day(20)), null)
})

test('a skipped day keeps « Ça s’apaise » for the next one noted, within a few days', () => {
  const entries = series([7, 8, 7, 8, 3])
  assert.equal(sharedFlare(entries, day(21))?.kind, 'easing')
  assert.equal(sharedFlare(entries, day(22)), null)
})

test('a day neither hard nor calm keeps the flare under way', () => {
  assert.equal(sharedFlare(series([7, 8, 7, 5]), day(18))?.kind, 'harder')
})

test('a flare whose end is unknown (days not noted) says nothing afterwards', () => {
  assert.equal(sharedFlare(series([7, 8, 7, null, null, null, null, 3]), day(23)), null)
})

test('the key changes with the day of the flare and the sentence, not otherwise', () => {
  const a = sharedFlare(series([7, 8, 7]), day(17))
  const b = sharedFlare(series([7, 8, 7, 8]), day(18))
  assert.notEqual(sharedFlareKey(a, undefined), sharedFlareKey(b, undefined))
  assert.notEqual(sharedFlareKey(a, 'Un message suffit.'), sharedFlareKey(a, undefined))
  assert.equal(sharedFlareKey(null, 'Un message suffit.'), '')
})
