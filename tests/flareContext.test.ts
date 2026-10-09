// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry, Medication } from '../src/db/types.ts'
import { detectFlares, flareDaySet } from '../src/lib/flares.ts'
import { flareContext } from '../src/lib/flareContext.ts'
import { shiftISO } from '../src/lib/medications.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (n: number, painLevel: number, extra: Partial<LoggedEntry> = {}): LoggedEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})

/** 40 usual days (pain 4, sleep 7 h, stress 4), then a flare on days 40–42
 * (pain 8), with `before` overriding the 3 days before it. */
function history(before: Partial<LoggedEntry> = {}, skip: number[] = []): LoggedEntry[] {
  const out: LoggedEntry[] = []
  for (let i = 0; i < 40; i++) {
    const extra = i >= 37 ? { sleepHours: 7, stressLevel: 4, ...before } : { sleepHours: 7, stressLevel: 4 }
    if (!skip.includes(i)) out.push(entry(i, 4, extra))
  }
  for (let i = 40; i < 43; i++) out.push(entry(i, 8, { sleepHours: 5, stressLevel: 8 }))
  return out
}
const flareOf = (entries: LoggedEntry[]) => detectFlares(entries)[0]!
const context = (entries: LoggedEntry[], meds: Medication[] = []) => {
  const episodes = detectFlares(entries)
  return flareContext(episodes[0]!, entries, meds, flareDaySet(episodes))
}
const med = (name: string, periods: Medication['periods']): Medication => ({
  id: name,
  name,
  regimen: 'scheduled',
  periods,
  createdAt: 0,
  updatedAt: 0,
})

test('the 3 days before a flare are averaged next to the usual level', () => {
  const entries = history({ sleepHours: 5, stressLevel: 7 })
  assert.equal(flareOf(entries).start, day(40))
  const { values } = context(entries)
  assert.equal(values.sleepHours.window, 5)
  assert.equal(values.sleepHours.usual, 7)
  assert.equal(values.stressLevel.window, 7)
  assert.equal(values.stressLevel.usual, 4)
})

test('what the flare itself looks like never enters the figures', () => {
  const { values } = context(history())
  assert.equal(values.sleepHours.window, 7)
  assert.equal(values.sleepHours.usual, 7)
})

test('an earlier flare is left out of the usual level', () => {
  const entries = history()
  for (let i = 15; i < 22; i++) Object.assign(entries[i]!, { painLevel: 9, sleepHours: 3 })
  assert.equal(detectFlares(entries).length, 2)
  const episodes = detectFlares(entries)
  const { values } = flareContext(episodes[1]!, entries, [], flareDaySet(episodes))
  assert.equal(values.sleepHours.usual, 7)
})

test('too few logged days leave a figure empty, not guessed', () => {
  const sparse = history({}, [37, 38])
  assert.equal(context(sparse).values.sleepHours.window, null)
  const noUsual = history().filter((e) => e.date >= day(30))
  const { values } = context(noUsual)
  assert.equal(values.sleepHours.usual, null)
  assert.equal(values.sleepHours.window, 7)
})

test('a measure that is not tracked is empty', () => {
  const { values } = context(history())
  assert.deepEqual(values.brainFog, { window: null, usual: null })
})

test('treatment changes in the 14 days before are listed, oldest first', () => {
  const dulox = med('Duloxétine', [
    { start: day(-200), end: day(35), dose: { amount: 30, unit: 'mg' }, perDay: 1 },
    { start: day(36), dose: { amount: 60, unit: 'mg' }, perDay: 1 },
  ])
  const prega = med('Prégabaline', [{ start: day(-30), end: day(30), dose: { amount: 75, unit: 'mg' }, perDay: 2, stopReason: 'sideEffects' }])
  const magnesium = med('Magnésium', [{ start: day(38) }])
  const { events } = context(history(), [dulox, prega, magnesium])
  assert.deepEqual(events.map((e) => [e.med.name, e.kind, e.date]), [
    ['Prégabaline', 'stopped', day(30)],
    ['Duloxétine', 'doseChanged', day(36)],
    ['Magnésium', 'started', day(38)],
  ])
  assert.equal(events[1]!.previous?.dose?.amount, 30)
  assert.equal(events[0]!.period.stopReason, 'sideEffects')
})

test('changes outside the 14 days, or on the flare day, are not listed', () => {
  const old = med('Ancien', [{ start: day(-100), end: day(20) }])
  const same = med('Même jour', [{ start: day(40) }])
  const onWindowEdge = med('Limite', [{ start: day(26) }])
  const { events } = context(history(), [old, same, onWindowEdge])
  assert.deepEqual(events.map((e) => e.med.name), ['Limite'])
})
