// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { MIN_TRACKED, cleanMdphGestures, enough, mdphData, periodStart } from '../src/lib/mdph.ts'
import { shiftISO } from '../src/lib/dates.ts'

const entry = (date: string, painLevel: number, more: Partial<DailyEntry> = {}): DailyEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0, ...more })

/** Usual pain (3) from 1 August, a 5-day flare from 1 September, calm again until `today`. */
function journal(today: string, more: (d: string) => Partial<DailyEntry> = () => ({})): DailyEntry[] {
  const out: DailyEntry[] = []
  for (let d = '2026-08-01'; d <= today; d = shiftISO(d, 1)) {
    const flare = d >= '2026-09-01' && d <= '2026-09-05'
    out.push(entry(d, flare ? 8 : 3, more(d)))
  }
  return out
}

test('the period ends today and starts the day after the same date, months back', () => {
  assert.equal(periodStart('2026-11-24', 12), '2025-11-25')
  assert.equal(periodStart('2026-11-24', 3), '2026-08-25')
  // A day the earlier month does not have is brought back to its last day.
  assert.equal(periodStart('2026-05-31', 3), '2026-03-01')
})

test('a journal younger than the period is read from its first day, and says so', () => {
  const data = mdphData({ entries: journal('2026-10-31'), medications: [], today: '2026-10-31', months: 12 })
  assert.equal(data.start, '2026-08-01')
  assert.equal(data.shorter, true)
  assert.equal(data.logged, 92)
  assert.equal(data.span, 92)
})

test('flare days and strong days are counted by month, inside the period only', () => {
  const data = mdphData({ entries: journal('2026-10-31'), medications: [], today: '2026-10-31', months: 12 })
  assert.deepEqual(
    data.months.map((m) => [m.month, m.calendarDays, m.logged, m.flareDays, m.strongDays]),
    [
      ['2026-08', 31, 31, 0, 0],
      ['2026-09', 30, 30, 5, 5],
      ['2026-10', 31, 31, 0, 0],
    ]
  )
  assert.equal(data.flares.length, 1)
  assert.equal(data.flareDayCount, 5)
  assert.deepEqual(data.strong, { days: 5, tracked: 92 })
})

test('a flare that began before the period counts only its days inside it', () => {
  const data = mdphData({ entries: journal('2026-12-03'), medications: [], today: '2026-12-03', months: 3 })
  assert.equal(data.start, '2026-09-04')
  assert.equal(data.flares.length, 1)
  assert.equal(data.flareDayCount, 2)
  assert.equal(data.months[0]!.flareDays, 2)
})

test('a measure counts only the days it was noted, and is shown from 14 of them', () => {
  const nights = (d: string) => (d >= '2026-10-01' ? { nightWakings: (d.endsWith('5') ? 2 : 0) as 0 | 2 } : {})
  const data = mdphData({ entries: journal('2026-10-31', nights), medications: [], today: '2026-10-31', months: 12 })
  assert.deepEqual(data.nights, { days: 3, tracked: 31 })
  assert.ok(enough(data.nights))
  assert.ok(!enough({ days: 1, tracked: MIN_TRACKED - 1 }))
})

test('the kiné is counted in either language, and nothing else is', () => {
  const care = (d: string) => (d.endsWith('1') ? { positiveActions: ['Kiné / soins'] } : d.endsWith('2') ? { positiveActions: ['Physiotherapy / care'] } : d.endsWith('3') ? { positiveActions: ['Marche courte'] } : {})
  const data = mdphData({ entries: journal('2026-08-31', care), medications: [], today: '2026-08-31', months: 12 })
  // 1, 11, 21, 31 and 2, 12, 22 August.
  assert.equal(data.careDays, 7)
})

test('the gestures keep known answers only', () => {
  assert.deepEqual(cleanMdphGestures({ shopping: 'often', leisure: 'sometimes', hygiene: 'always', flying: 'often' }), { shopping: 'often', leisure: 'sometimes' })
  assert.equal(cleanMdphGestures({ hygiene: 1 }), undefined)
  assert.equal(cleanMdphGestures(['often']), undefined)
  assert.equal(cleanMdphGestures(null), undefined)
})
