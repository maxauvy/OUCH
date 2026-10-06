// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { canDetectFlares, detectFlares, flareDayCount, flareDaySet, flaresOverlapping, flareThreshold } from '../src/lib/flares.ts'
import { shiftISO } from '../src/lib/medications.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (date: string, painLevel: number): DailyEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0 })

/** `usual` pain on days 0–13, then `values` from day 14 (null = not logged). */
function series(values: (number | null)[], usual = 4): DailyEntry[] {
  const out = Array.from({ length: 14 }, (_, i) => entry(day(i), usual))
  values.forEach((v, i) => v !== null && out.push(entry(day(14 + i), v)))
  return out
}

test('the rise needed is 2 points or 30 % of the usual level, whichever is larger', () => {
  assert.equal(flareThreshold(3), 5)
  assert.equal(flareThreshold(4), 6)
  assert.equal(flareThreshold(8), 10.4)
  assert.ok(Math.abs(flareThreshold(7) - 9.1) < 1e-9)
})

test('three days clearly above the usual level are a flare, with its figures', () => {
  const [ep, ...rest] = detectFlares(series([7, 8, 7, 4, 4]))
  assert.equal(rest.length, 0)
  assert.deepEqual(ep, {
    start: day(14),
    end: day(16),
    days: 3,
    peak: 8,
    baseline: 4,
    recoveryDays: 1,
    ongoing: false,
    endUnknown: false,
  })
})

test('one or two high days are not a flare', () => {
  assert.deepEqual(detectFlares(series([8, 4, 4])), [])
  assert.deepEqual(detectFlares(series([8, 8, 4, 4])), [])
})

test('the same score is a flare for one person and an ordinary day for another', () => {
  assert.equal(detectFlares(series([7, 7, 7, 4, 4], 4)).length, 1)
  assert.equal(detectFlares(series([7, 7, 7, 7], 7)).length, 0)
  assert.equal(detectFlares(series([7, 7, 7, 4, 4], 6)).length, 0)
  assert.equal(detectFlares(series([8, 8, 8, 6, 6], 6)).length, 1)
})

test('a low score is never a flare, however far above a very low usual level', () => {
  assert.deepEqual(detectFlares(series([3, 3, 3, 1, 1], 1)), [])
  assert.equal(detectFlares(series([4, 4, 4, 1, 1], 1)).length, 1)
})

test('someone whose usual level leaves no room above is not detected', () => {
  assert.deepEqual(detectFlares(series([10, 10, 10, 9, 9], 9)), [])
})

test('without enough entries before, nothing is detected', () => {
  const few = [entry(day(0), 3), entry(day(1), 3), entry(day(2), 8), entry(day(3), 8), entry(day(4), 8)]
  assert.deepEqual(detectFlares(few), [])
})

test('a single easier day inside a flare does not split it', () => {
  const [ep, ...rest] = detectFlares(series([7, 7, 7, 4, 7, 4, 4]))
  assert.equal(rest.length, 0)
  assert.equal(ep.start, day(14))
  assert.equal(ep.end, day(18))
  assert.equal(ep.days, 5)
  assert.equal(ep.recoveryDays, 1)
})

test('two easy days in a row end it, and a later rise is a second flare', () => {
  const eps = detectFlares(series([7, 7, 7, 4, 4, 4, 7, 8, 8, 4, 4]))
  assert.deepEqual(eps.map((e) => [e.start, e.end]), [[day(14), day(16)], [day(20), day(22)]])
})

test('one unlogged day between high days does not break the run, two in a row do', () => {
  assert.equal(detectFlares(series([7, null, 7, 7, 4, 4])).length, 1)
  assert.deepEqual(detectFlares(series([7, null, null, 7, 4, 4])), [])
})

test('entries stopping after high days leave the end unknown', () => {
  const entries = [...series([7, 8, 8]), entry(day(21), 4)]
  const [ep] = detectFlares(entries)
  assert.equal(ep.end, day(16))
  assert.equal(ep.endUnknown, true)
  assert.equal(ep.recoveryDays, null)
})

test('a flare still high on the last day is ongoing', () => {
  const [ep] = detectFlares(series([7, 8, 8]))
  assert.equal(ep.ongoing, true)
  assert.equal(ep.recoveryDays, null)
  assert.equal(detectFlares(series([7, 8, 8]), { asOf: day(17) })[0].ongoing, true)
  assert.equal(detectFlares(series([7, 8, 8]), { asOf: day(18) })[0].ongoing, false)
})

test('days after asOf are ignored', () => {
  assert.deepEqual(detectFlares(series([4, 4, 7, 8, 8]), { asOf: day(16) }), [])
})

test('days in an earlier flare do not raise the usual level for the next one', () => {
  const long = Array<number>(10).fill(9)
  const entries = series([...long, 4, 4, 7, 7, 7, 4, 4])
  const options = { baselineDays: 14, minBaselineDays: 4 }
  const eps = detectFlares(entries, options)
  assert.deepEqual(eps.map((e) => [e.start, e.end, e.baseline]), [[day(14), day(23), 4], [day(26), day(28), 4]])
})

test('entries given out of order give the same result', () => {
  const entries = series([7, 8, 7, 4, 4])
  assert.deepEqual(detectFlares([...entries].reverse()), detectFlares(entries))
})

test('flare days are counted inside a period, clipped at its edges', () => {
  const eps = detectFlares(series([7, 8, 7, 4, 4, 4, 7, 8, 8, 4, 4]))
  assert.equal(flareDayCount(eps, day(0), day(30)), 6)
  assert.equal(flareDayCount(eps, day(15), day(19)), 2)
  assert.equal(flareDayCount(eps, day(0), day(10)), 0)
})

test('detection is possible once a day has enough logged days before it', () => {
  assert.equal(canDetectFlares(series([])), true)
  assert.equal(canDetectFlares(series([]).slice(0, 10)), false)
  assert.equal(canDetectFlares(series([]).slice(0, 11)), true)
  assert.equal(canDetectFlares([]), false)
})

test('episodes touching a range are found, even when they start before it', () => {
  const eps = detectFlares(series([7, 8, 7, 4, 4, 4, 7, 8, 8, 4, 4]))
  assert.equal(flaresOverlapping(eps, day(0), day(30)).length, 2)
  assert.equal(flaresOverlapping(eps, day(16), day(18)).length, 1)
  assert.equal(flaresOverlapping(eps, day(17), day(19)).length, 0)
  assert.equal(flaresOverlapping(eps, day(21), day(40)).length, 1)
})

test('every day of a flare is in the set, logged or not', () => {
  const eps = detectFlares(series([7, null, 7, 7, 4, 4]))
  assert.deepEqual([...flareDaySet(eps)].sort(), [day(14), day(15), day(16), day(17)])
  assert.equal(flareDaySet([]).size, 0)
})
