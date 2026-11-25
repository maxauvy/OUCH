// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry } from '../src/db/types.ts'
import { MIN_DAYS, trialCount, cleanWish, entryCardYear, reviewYear, yearReview, yearWishFromBackup } from '../src/lib/yearReview.ts'
import { shiftISO } from '../src/lib/dates.ts'

const entry = (date: string, painLevel: number, more: Partial<DailyEntry> = {}): DailyEntry => ({ date, painLevel, createdAt: 0, updatedAt: 0, ...more })

/** Usual pain (4) every day from `from` to `to`, a 5-day flare from 1 October, a day not noted on 20 October. */
function journal(from: string, to: string, more: (d: string) => Partial<DailyEntry> = () => ({})): DailyEntry[] {
  const out: DailyEntry[] = []
  for (let d = from; d <= to; d = shiftISO(d, 1)) {
    if (d === '2026-10-20') continue
    const flare = d >= '2026-10-01' && d <= '2026-10-05'
    out.push(entry(d, flare ? 8 : d.endsWith('7') ? 1 : 4, more(d)))
  }
  return out
}

test('the year told is this one in December, the last one in January, none otherwise', () => {
  assert.equal(reviewYear('2026-12-01'), 2026)
  assert.equal(reviewYear('2027-01-31'), 2026)
  assert.equal(reviewYear('2026-11-30'), null)
  assert.equal(reviewYear('2027-02-01'), null)
})

test('the card of the day’s page: 15 December to 15 January, until opened or put off', () => {
  assert.equal(entryCardYear('2026-12-14', undefined), null)
  assert.equal(entryCardYear('2026-12-15', undefined), 2026)
  assert.equal(entryCardYear('2027-01-15', undefined), 2026)
  assert.equal(entryCardYear('2027-01-16', undefined), null)
  assert.equal(entryCardYear('2026-12-20', 2026), null)
  assert.equal(entryCardYear('2026-12-20', 2025), 2026)
})

test('a short year is not told', () => {
  const entries = journal('2026-12-01', shiftISO('2026-12-01', MIN_DAYS - 2))
  assert.equal(yearReview({ entries, year: 2026, today: '2026-12-31', flaresApply: true }), null)
})

test('the year holds its days, its gentle days, its flares that ended and its longest calm stretch', () => {
  const entries = journal('2026-08-01', '2026-12-20')
  const r = yearReview({ entries, year: 2026, today: '2026-12-20', flaresApply: true })!
  assert.equal(r.first, '2026-08-01')
  assert.equal(r.logged, entries.length)
  assert.equal(r.gentle, entries.filter((e) => (e.painLevel ?? 10) <= 3).length)
  assert.deepEqual(r.flares, [5])
  // From 6 October to 20 December: the day not noted on 20 October does not break it.
  assert.deepEqual(r.calm, { start: '2026-10-06', end: '2026-12-20', days: 76 })
})

test('without flares for the illness, none are told', () => {
  const r = yearReview({ entries: journal('2026-08-01', '2026-12-20'), year: 2026, today: '2026-12-20', flaresApply: false })!
  assert.deepEqual(r.flares, [])
})

test('what helped, trials, the note and appointments of that year only', () => {
  const entries = journal('2026-09-01', '2026-12-10', (d) => (d.endsWith('1') ? { positiveActions: ['Repos / sieste'] } : d.endsWith('2') ? { positiveActions: ['Marche courte', 'repos / sieste'] } : {}))
  const r = yearReview({
    entries,
    year: 2026,
    today: '2026-12-10',
    flaresApply: true,
    trials: [
      { key: 'action:marche courte', action: 'Marche courte', start: '2026-11-06', end: '2026-11-15' },
      { key: 'action:bain', action: 'Bain', start: '2025-11-06', end: '2025-11-15' },
    ],
    note: { text: 'Doucement', date: '2026-10-30' },
    appointments: [
      { date: '2026-10-28', kind: 'gp' },
      { date: '2025-06-01', kind: 'gp' },
    ],
  })!
  assert.equal(r.helped[0]!.label, 'Repos / sieste')
  assert.equal(r.helped[1]!.label, 'Marche courte')
  assert.deepEqual(r.trials, [{ action: 'Marche courte', times: 1 }])
  assert.equal(r.wroteNote, true)
  assert.equal(r.appointments, 1)
})

test('the line for the year to come is one tidy line, and a backup gives it back only when sound', () => {
  assert.equal(cleanWish('  continuer\n à  m’écouter  '), 'continuer à m’écouter')
  assert.equal(cleanWish(42), '')
  assert.deepEqual(yearWishFromBackup({ year: 2026, text: ' Respirer ' }), { year: 2026, text: 'Respirer' })
  assert.equal(yearWishFromBackup({ year: '2026', text: 'x' }), undefined)
  assert.equal(yearWishFromBackup({ year: 2026, text: '  ' }), undefined)
})

test('an action tried several times is one line with its times, not repeated', () => {
  const entries = journal('2026-09-01', '2026-12-10', () => ({}))
  const trial = (action: string, start: string, end: string) => ({ key: `action:${action.toLowerCase()}`, action, start, end })
  const r = yearReview({
    entries,
    year: 2026,
    today: '2026-12-10',
    flaresApply: true,
    trials: [trial('Chaleur', '2026-09-02', '2026-09-11'), trial('chaleur ', '2026-09-20', '2026-09-29'), trial('Marche courte', '2026-10-05', '2026-10-14'), trial('Chaleur', '2026-11-01', '2026-11-10')],
  })!
  assert.deepEqual(r.trials, [
    { action: 'Chaleur', times: 3 },
    { action: 'Marche courte', times: 1 },
  ])
  assert.equal(trialCount(r.trials), 4)
})
