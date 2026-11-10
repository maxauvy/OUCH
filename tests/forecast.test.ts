// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/dates.ts'
import { DROP_HPA, diaryOfFalls, fallTomorrow, forecastReading, isFresh, parseForecast, type ForecastCache } from '../src/lib/forecast.ts'

const today = '2026-11-09'
/** A diary of `n` days ending yesterday: the pressure falls by 8 every sixth day and wanders by a hPa or two between; pain is `harder` on a fall, else 3 to 5. */
function diary(n: number, { every = 6, onFall = 8, otherwise = (i: number) => 3 + (i % 3) }: { every?: number; onFall?: number; otherwise?: (i: number) => number } = {}): DailyEntry[] {
  const out: DailyEntry[] = []
  let p = 1020
  for (let i = 0; i < n; i++) {
    const fall = i > 0 && i % every === 0
    p = fall ? p - 8 : i % every === 1 ? p + 6 : p + (i % 2 ? 1 : -1)
    out.push({ date: shiftISO(today, -(n - i)), painLevel: fall ? onFall : otherwise(i), weather: { source: 'auto', condition: 'variable', pressureHpa: p }, createdAt: 0, updatedAt: 0 } as DailyEntry)
  }
  return out
}
const cache = (a: number, b: number): ForecastCache => ({ fetchedOn: today, days: [{ date: today, pressureHpa: a }, { date: shiftISO(today, 1), pressureHpa: b }] })

test('the answer of the forecast is read day by day, what is missing or odd is left out', () => {
  assert.deepEqual(parseForecast({ daily: { time: ['2026-11-09', '2026-11-10', '2026-11-11'], pressure_msl_mean: [1018.4, 1009.6, null] } }), [
    { date: '2026-11-09', pressureHpa: 1018 }, { date: '2026-11-10', pressureHpa: 1010 },
  ])
  assert.deepEqual(parseForecast(null), [])
  assert.deepEqual(parseForecast({ daily: { time: 'x' } }), [])
  assert.deepEqual(parseForecast({ daily: { time: ['demain'], pressure_msl_mean: [1000] } }), [])
})

test('tomorrow is a fall from the threshold on, and only when the forecast covers both days', () => {
  assert.equal(fallTomorrow(cache(1018, 1009), today), 9)
  assert.equal(fallTomorrow(cache(1018, 1018 - DROP_HPA), today), DROP_HPA)
  assert.equal(fallTomorrow(cache(1018, 1018 - DROP_HPA + 1), today), null)
  assert.equal(fallTomorrow(cache(1010, 1018), today), null)
  assert.equal(fallTomorrow({ fetchedOn: today, days: [{ date: today, pressureHpa: 1018 }] }, today), null)
  assert.equal(fallTomorrow(undefined, today), null)
})

test('a diary where the days of falling pressure were harder than usual, more than chance gives, says so', () => {
  const r = diaryOfFalls(diary(60), today)
  assert.ok(r, 'a reading')
  assert.ok(r.k >= 5 && r.observed === r.k, `${r.k} falls, ${r.observed} harder`)
  assert.ok(r.observed > r.high)
  assert.ok(r.low <= r.high)
})

test('nothing is said under 30 usable days, or under 5 days of falls', () => {
  assert.equal(diaryOfFalls(diary(25), today), null)
  assert.equal(diaryOfFalls(diary(60, { every: 20 }), today), null)
})

test('nothing is said when the falls were no harder than other days', () => {
  assert.equal(diaryOfFalls(diary(60, { onFall: 4, otherwise: () => 4 }), today), null)
  // Harder days are everywhere, so a fall being one is what chance gives.
  assert.equal(diaryOfFalls(diary(60, { onFall: 8, otherwise: (i) => (i % 2 ? 8 : 2) }), today), null)
})

test('days without pressure or without pain are not read, and today is not part of the diary', () => {
  const list = diary(60).map((e) => ({ ...e, weather: undefined }))
  assert.equal(diaryOfFalls(list, today), null)
  const withToday = [...diary(60), { date: today, painLevel: 9, weather: { source: 'auto', condition: 'variable', pressureHpa: 900 }, createdAt: 0, updatedAt: 0 } as DailyEntry]
  assert.deepEqual(diaryOfFalls(withToday, today), diaryOfFalls(diary(60), today))
})

test('the line needs both: a fall tomorrow and a diary that shows more than chance', () => {
  const entries = diary(60)
  const r = forecastReading(entries, cache(1018, 1009), today)
  assert.ok(r)
  assert.equal(r.fall, 9)
  assert.equal(forecastReading(entries, cache(1018, 1016), today), null)
  assert.equal(forecastReading(diary(25), cache(1018, 1009), today), null)
  assert.equal(forecastReading(entries, undefined, today), null)
})

test('a forecast is fresh the day it was fetched, when it reaches tomorrow', () => {
  assert.equal(isFresh(cache(1018, 1009), today), true)
  assert.equal(isFresh({ ...cache(1018, 1009), fetchedOn: shiftISO(today, -1) }, today), false)
  assert.equal(isFresh({ fetchedOn: today, days: [{ date: today, pressureHpa: 1018 }] }, today), false)
  assert.equal(isFresh(undefined, today), false)
})
