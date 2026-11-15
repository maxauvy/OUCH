// Run with `npm test`.
// A flare OUCH detects and a period the patient marks are two different things, kept apart on purpose (lib/markedFlares.ts). When they overlap, nothing is
// counted twice: each is counted in its own list and the two are never added. These tests keep that true.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import type { LoggedEntry } from '../src/db/types.ts'
import { sinceFacts } from '../src/lib/consultation.ts'
import { detectFlares, flareDayCount, flareDaySet } from '../src/lib/flares.ts'
import { markedDaySet, markedOverlapping, resolveMarked } from '../src/lib/markedFlares.ts'
import { flaresTile } from '../src/lib/report.ts'
import { markedSpans, timelineItems } from '../src/lib/trendsTimeline.ts'
import { shiftISO } from '../src/lib/dates.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (date: string, painLevel: number): LoggedEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0 })
/** Two weeks at 4, then days 14 to 16 high (a flare), then back to 4. */
const entries = [...Array.from({ length: 14 }, (_, i) => entry(day(i), 4)), entry(day(14), 7), entry(day(15), 8), entry(day(16), 7), entry(day(17), 4), entry(day(18), 4)]
const today = day(30)

const episodes = detectFlares(entries)
// The patient marks a stretch that covers the flare and goes beyond it on both sides.
const markedList = [{ start: day(12), end: day(20), factors: [], note: undefined }]
const marked = markedList.map((m) => resolveMarked(m as never, today))

test('the set up: one flare detected, one period marked, over the same days', () => {
  assert.equal(episodes.length, 1)
  assert.equal(marked.length, 1)
  const detectedDays = flareDaySet(episodes)
  for (const d of detectedDays) assert.ok(markedDaySet(markedList as never, today).has(d), `${d} is in both`)
})

test('the days of the flares are those of the flares, whatever the patient marked', () => {
  assert.equal(flareDaySet(episodes).size, 3)
  assert.equal(flareDayCount(episodes, day(0), day(30)), 3)
  // The marked days are their own set: nine days, three of which are also flare days.
  assert.equal(markedDaySet(markedList as never, today).size, 9)
})

test('since the last appointment, each is counted once in its own line, and there is no total', () => {
  const r = sinceFacts({ from: day(0), to: day(30), flares: episodes, marked, events: [] })
  assert.deepEqual([r.detected, r.marked], [1, 1])
  assert.equal(Object.keys(r).includes('total'), false)
})

test('in the timeline each is its own line: one flare and one marked period, not merged and not repeated', () => {
  const items = timelineItems({ from: day(0), to: day(30), flares: episodes, marked, events: [], history: [], current: undefined, today })
  assert.deepEqual(items.map((i) => i.kind).sort(), ['flare', 'marked'])
  assert.deepEqual(markedSpans(items), [{ from: day(12), to: day(20) }])
})

test('the periods that touch a range are listed once each, however many flares are over them', () => {
  assert.equal(markedOverlapping(markedList as never, day(14), day(16), today).length, 1)
  assert.equal(markedOverlapping(markedList as never, day(0), day(30), today).length, 1)
})

test('the flares tile counts the detected flares when it can, and never adds the marked periods to them', () => {
  assert.deepEqual(flaresTile(true, 1, 1), { kind: 'detected', value: 1 })
  assert.deepEqual(flaresTile(true, 0, 3), { kind: 'detected', value: 0 })
  assert.deepEqual(flaresTile(true, 2, 0), { kind: 'detected', value: 2 })
})

test('when nothing can be detected, the tile counts the marked periods and says so; with none of either, there is no tile', () => {
  assert.deepEqual(flaresTile(false, 0, 2), { kind: 'marked', value: 2 })
  assert.equal(flaresTile(false, 0, 0), null)
})

// The modules that detect, count and compare never read the periods the patient marked: a marked period cannot change a figure computed from the journal.
test('the calculations do not import the marked periods', () => {
  const calculations = ['flares', 'flareContext', 'treatmentReview', 'periodComparison', 'leads', 'leadTrial', 'weekdays', 'report', 'stats', 'regularity', 'dayMix']
  for (const name of calculations) {
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /markedFlares|MarkedFlare|ResolvedFlare|markedOverlapping|markedDaySet/, `${name}.ts reads the marked periods`)
  }
})

test("the report's flare figures are built from the detected episodes only", () => {
  const source = readFileSync(new URL('../src/components/report/reportData.ts', import.meta.url), 'utf8')
  const block = source.slice(source.indexOf('    flares: {'), source.indexOf('    marked: markedOverlapping'))
  assert.ok(block.length > 100, 'the flares block was found')
  assert.doesNotMatch(block, /marked/i, 'the flares block of the report reads the marked periods')
  // And the marked periods are their own field, listed by themselves.
  assert.match(source, /marked: markedOverlapping\(options\.markedFlares/)
})
