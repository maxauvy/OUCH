// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LoggedEntry } from '../src/db/types.ts'
import type { FlareEpisode } from '../src/lib/flares.ts'
import type { LeadTrial } from '../src/lib/leadTrial.ts'
import { monthSummary } from '../src/lib/monthSummary.ts'
import { shiftISO } from '../src/lib/dates.ts'

// September 2026: 30 days, weeks of seven from the 1st (1-7, 8-14, 15-21, 22-28), the last two days left out.
const entry = (date: string, painLevel: number): LoggedEntry => ({ date, painLevel }) as LoggedEntry
const days = (from: string, n: number, pain: (i: number) => number) => Array.from({ length: n }, (_, i) => entry(shiftISO(from, i), pain(i)))
const trial = (end: string): LeadTrial => ({ key: 'action:marche', action: 'Marche', start: shiftISO(end, -6), end })
const flare = (end: string, recoveryDays: number | null = 2, over: Partial<FlareEpisode> = {}): FlareEpisode => ({ start: shiftISO(end, -4), end, days: 5, peak: 8, baseline: 3, recoveryDays, ongoing: false, endUnknown: false, ...over })

const sept = days('2026-09-01', 30, (i) => (i < 14 ? 5 : 3))
const base = { today: '2026-10-03', entries: sept, history: [trial('2026-09-14')], episodes: [] as FlareEpisode[] }

test('in the first days of the month, the month before is summed up', () => {
  const s = monthSummary(base)
  assert.equal(s?.month, '2026-09')
  assert.equal(s?.trials, 1)
  assert.deepEqual(s?.softestWeek && [s.softestWeek.start, s.softestWeek.end, s.softestWeek.mean], ['2026-09-15', '2026-09-21', 3])
})

test('later in the month nothing is brought', () => {
  assert.equal(monthSummary({ ...base, today: '2026-10-08' }), null)
  assert.notEqual(monthSummary({ ...base, today: '2026-10-07' }), null)
})

test('the way back counts the flares that ended in the month, with the mean days', () => {
  const s = monthSummary({ ...base, history: [], episodes: [flare('2026-09-10', 2), flare('2026-09-25', 4), flare('2026-08-30', 3), flare('2026-09-20', 2, { ongoing: true })] })
  assert.deepEqual(s?.back, { flares: 2, days: 3 })
})

test('fewer than two lines, or too few logged days, say nothing', () => {
  assert.equal(monthSummary({ ...base, history: [], entries: sept.filter((e) => e.date < '2026-09-15') }), null)
  assert.equal(monthSummary({ ...base, entries: sept.slice(0, 8) }), null)
})

test('the softest week needs at least two weeks with enough days', () => {
  const sparse = [...days('2026-09-01', 7, () => 4), ...days('2026-09-08', 3, () => 2)]
  const s = monthSummary({ ...base, entries: [...sparse, ...days('2026-09-22', 3, () => 4)], episodes: [flare('2026-09-10')] })
  assert.equal(s?.softestWeek, null)
  assert.equal(s?.trials, 1)
  assert.deepEqual(s?.back, { flares: 1, days: 2 })
})

test('January looks back at December', () => {
  const dec = days('2026-12-01', 31, () => 4)
  assert.equal(monthSummary({ ...base, today: '2027-01-02', entries: dec, history: [trial('2026-12-20')], episodes: [flare('2026-12-12')] })?.month, '2026-12')
})
