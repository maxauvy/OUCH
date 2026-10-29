// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareFlareZones, zoneStrips } from '../src/lib/zoneTrends.ts'
import { shiftISO } from '../src/lib/dates.ts'

const END = '2026-10-19'
const day = (i: number, zones: string[] = []) => ({ date: shiftISO(END, -i), painLocations: zones })
const flare = (from: number, to: number) => new Set(Array.from({ length: to - from + 1 }, (_, k) => shiftISO(END, -(from + k))))

test('the zones of flare days are compared only with enough days on both sides', () => {
  const few = [...Array.from({ length: 5 }, (_, i) => day(i, ['neck'])), ...Array.from({ length: 30 }, (_, i) => day(i + 10))]
  assert.equal(compareFlareZones(few, flare(0, 4)).enough, false)
  assert.deepEqual(compareFlareZones(few, flare(0, 4)).rows, [])
  const noOthers = Array.from({ length: 10 }, (_, i) => day(i, ['neck']))
  assert.equal(compareFlareZones(noOthers, flare(0, 9)).enough, false)
})

test('a zone is named only when it is clearly more frequent on flare days', () => {
  const entries = [
    ...Array.from({ length: 8 }, (_, i) => day(i, ['lowerBack', i < 6 ? 'rightHip' : 'neck'])), // flare: 8 days
    ...Array.from({ length: 20 }, (_, i) => day(i + 10, ['lowerBack', i < 2 ? 'rightHip' : 'neck'])), // others: 20 days
  ]
  const r = compareFlareZones(entries, flare(0, 7))
  assert.equal(r.enough, true)
  assert.equal(r.flareDays, 8)
  assert.equal(r.otherDays, 20)
  // lowerBack is everywhere (no gap); neck is the other way round; rightHip: 6/8 against 2/20
  assert.deepEqual(r.rows, [{ zone: 'rightHip', flareDays: 6, otherDays: 2 }])
  assert.equal(r.flareShares.get('lowerBack'), 1)
})

test('a zone on only two flare days is not named, whatever the gap', () => {
  const entries = [
    ...Array.from({ length: 8 }, (_, i) => day(i, i < 2 ? ['jaw'.replace('jaw', 'leftJaw')] : [])),
    ...Array.from({ length: 20 }, (_, i) => day(i + 10)),
  ]
  assert.deepEqual(compareFlareZones(entries, flare(0, 7)).rows, [])
})

test('the weekly strips need three weeks of logged days and name the most reported zones', () => {
  assert.equal(zoneStrips(Array.from({ length: 10 }, (_, i) => day(i, ['neck'])), END, new Set()), null)
  const entries = Array.from({ length: 40 }, (_, i) => day(i, i % 2 ? ['neck', 'generalized'] : ['neck', 'leftShoulder']))
  const s = zoneStrips(entries, END, flare(0, 2))
  assert.ok(s)
  assert.equal(s.weeks.length, 13)
  assert.equal(s.weeks[12].end, END)
  assert.equal(s.weeks[12].flare, true)
  assert.equal(s.weeks[11].flare, false)
  // 'generalized' is not a row; neck first, then the shoulder
  assert.deepEqual(s.rows.map((r) => r.zone), ['neck', 'leftShoulder'])
  assert.deepEqual(s.rows[0].cells[12], { days: 7, logged: 7 })
  assert.equal(s.rows[1].cells[12].days, 4)
})

test('no zone at all gives no strips', () => {
  assert.equal(zoneStrips(Array.from({ length: 30 }, (_, i) => day(i)), END, new Set()), null)
})
