// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry, Medication } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/medications.ts'
import { changeDate, reviewWindows, treatmentReviews } from '../src/lib/treatmentReview.ts'

const START = '2026-01-01'
const day = (n: number) => shiftISO(START, n)
const entry = (n: number, painLevel: number, extra: Partial<LoggedEntry> = {}): LoggedEntry => ({
  date: day(n),
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})
const med = (id: string, periods: Medication['periods'], regimen: Medication['regimen'] = 'scheduled'): Medication => ({
  id,
  name: id,
  regimen,
  periods,
  createdAt: 0,
  updatedAt: 0,
})

/** Dose raised on day 100. Pain: 6 before, 9 during the 7 settling days, 4 after. */
const raised = med('duloxetine', [{ start: day(0), end: day(99) }, { start: day(100) }])
function raisedHistory(extra: (n: number) => Partial<LoggedEntry> = () => ({})): LoggedEntry[] {
  const out: LoggedEntry[] = []
  for (let n = 72; n < 136; n++) out.push(entry(n, n < 100 ? 6 : n < 107 ? 9 : 4, extra(n)))
  return out
}
const review = (entries: LoggedEntry[], meds: Medication[], asOf: string, flareDays: Set<string> | null = new Set()) =>
  treatmentReviews(entries, meds, flareDays, asOf).filter((r) => r.event.med.id === 'duloxetine' && r.event.kind === 'doseChanged')[0]!

test('windows: 28 days before, 7 not counted, 28 after', () => {
  const w = reviewWindows(day(100))
  assert.equal(w.beforeFrom, day(72))
  assert.equal(w.beforeTo, day(99))
  assert.equal(w.afterFrom, day(107))
  assert.equal(w.afterTo, day(134))
})

test('compares the means either side and leaves the settling days out', () => {
  const r = review(raisedHistory(), [raised], day(140))
  assert.equal(r.status, 'ready')
  assert.equal(r.nBefore, 28)
  assert.equal(r.nAfter, 28)
  assert.equal(r.measures.pain.before, 6)
  assert.equal(r.measures.pain.after, 4)
})

test('a stop counts from the day after the last one taken', () => {
  const stopped = med('duloxetine', [{ start: day(0), end: day(99) }])
  const [r] = treatmentReviews(raisedHistory(), [stopped], new Set(), day(140)).filter((x) => x.event.kind === 'stopped')
  assert.equal(r!.date, day(100))
  assert.equal(changeDate(r!.event), day(100))
})

test('a window still running is in progress, with figures only from 14 logged days', () => {
  const some = review(raisedHistory(), [raised], day(125))
  assert.equal(some.status, 'inProgress')
  assert.equal(some.comparable, true)
  assert.equal(some.measures.pain.after, 4)
  assert.equal(some.measures.flareDays.after, null)
  assert.equal(some.measures.pain.usualGap, null)
  const few = review(raisedHistory(), [raised], day(112))
  assert.equal(few.status, 'inProgress')
  assert.equal(few.comparable, false)
  assert.equal(few.measures.pain.before, null)
  assert.equal(few.daysAfter, 6)
})

test('too few logged days before gives no figure', () => {
  const entries = raisedHistory().filter((e) => e.date >= day(90))
  const r = review(entries, [raised], day(140))
  assert.equal(r.status, 'tooFewDays')
  assert.equal(r.measures.pain.before, null)
  assert.equal(r.measures.pain.after, null)
})

test('too few logged days after, once the window is over', () => {
  const entries = raisedHistory().filter((e) => e.date < day(107) || e.date > day(125))
  const r = review(entries, [raised], day(140))
  assert.equal(r.nAfter, 9)
  assert.equal(r.status, 'tooFewDays')
})

test('as-needed treatments are not reviewed; their use is a measure', () => {
  const rescue = med('paracetamol', [{ start: day(0) }], 'asNeeded')
  const entries = raisedHistory((n) =>
    n < 100 ? { intakes: [{ medicationId: 'paracetamol', doses: 2 }] } : n >= 107 ? { intakes: [{ medicationId: 'paracetamol' }] } : {}
  )
  const reviews = treatmentReviews(entries, [raised, rescue], new Set(), day(140))
  assert.ok(reviews.every((r) => r.event.med.id !== 'paracetamol'))
  const r = reviews.find((x) => x.event.kind === 'doseChanged')!
  assert.equal(r.measures.rescue.before, 2)
  assert.equal(r.measures.rescue.after, 1)
})

test('counts flare days in each full window, none while the window runs', () => {
  const flareDays = new Set([day(80), day(81), day(82), day(110)])
  const r = review(raisedHistory(), [raised], day(140), flareDays)
  assert.equal(r.measures.flareDays.before, 3)
  assert.equal(r.measures.flareDays.after, 1)
  assert.equal(review(raisedHistory(), [raised], day(125), flareDays).measures.flareDays.after, null)
  assert.equal(review(raisedHistory(), [raised], day(140), null).measures.flareDays.before, null)
})

test('a change in a flare is noted', () => {
  assert.equal(review(raisedHistory(), [raised], day(140), new Set([day(99)])).duringFlare, true)
  assert.equal(review(raisedHistory(), [raised], day(140), new Set([day(90)])).duringFlare, false)
})

test('other changes in the span are listed', () => {
  const other = med('amitriptyline', [{ start: day(115) }])
  const early = med('old', [{ start: day(0) }])
  const r = review(raisedHistory(), [raised, other, early], day(140))
  assert.deepEqual(
    r.alsoChanged.map((e) => e.med.id),
    ['amitriptyline']
  )
})

test('side effects reported with the treatment, most frequent first', () => {
  const entries = raisedHistory((n) =>
    n >= 107 && n < 113
      ? { intakes: [{ medicationId: 'duloxetine', sideEffects: ['nausea', 'dizziness'] }] }
      : n >= 113 && n < 115
        ? { intakes: [{ medicationId: 'duloxetine', sideEffects: ['nausea'] }] }
        : {}
  )
  const r = review(entries, [raised], day(140))
  assert.deepEqual(r.sideEffects.before, [])
  assert.deepEqual(r.sideEffects.after, [
    { effect: 'nausea', days: 8 },
    { effect: 'dizziness', days: 6 },
  ])
})

/** A long diary where pain alternates 5 / 6 month by month, then the change. */
function longHistory(): { entries: LoggedEntry[]; meds: Medication[] } {
  const entries: LoggedEntry[] = []
  for (let n = 0; n < 420; n++) entries.push(entry(n, n < 336 ? (Math.floor(n / 28) % 2 ? 6 : 5) : n < 343 ? 5 : 3))
  return { entries, meds: [med('duloxetine', [{ start: day(0), end: day(335) }, { start: day(336) }])] }
}

test('the usual gap between two months comes from the rest of the history', () => {
  const { entries, meds } = longHistory()
  const r = review(entries, meds, day(419))
  assert.equal(r.status, 'ready')
  assert.equal(r.measures.pain.usualGap, 1)
  assert.equal(r.measures.pain.before, 6)
  assert.equal(r.measures.pain.after, 3)
})

test('no usual gap without enough history, or while the window runs', () => {
  assert.equal(review(raisedHistory(), [raised], day(140)).measures.pain.usualGap, null)
  const { entries, meds } = longHistory()
  assert.equal(review(entries, meds, day(360)).measures.pain.usualGap, null)
})
