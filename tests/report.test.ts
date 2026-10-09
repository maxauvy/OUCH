// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry, Medication, MedicationIntake } from '../src/db/types.ts'
import {
  association,
  compareContext,
  daysBetween,
  daysWithRescueMedication,
  mean,
  meanOf,
  median,
  medicationReports,
  painStats,
  pressureChange,
  quantile,
  reportPeriods,
  rollingMean,
  sd,
  spearman,
  splitEntries,
  strengthIndex,
  tagShares,
  trailingMeans,
  weeklyRows,
  collapseDoublePeriod,
} from '../src/lib/report.ts'
import { shiftISO } from '../src/lib/medications.ts'

const day = (n: number) => shiftISO('2026-09-01', n)
const entry = (date: string, painLevel: number, extra: Partial<DailyEntry> = {}): DailyEntry => ({
  date,
  painLevel,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
})
const near = (a: number | null | undefined, b: number, eps = 1e-9) =>
  assert.ok(typeof a === 'number' && Math.abs(a - b) < eps, `${a} ≈ ${b}`)

// ---------------------------------------------------------------------------
// Statistics

test('days are counted between two ISO dates, over a change of season', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-31'), 30)
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2)
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
  assert.equal(daysBetween('2026-09-05', '2026-09-05'), 0)
})

test('mean, standard deviation, quantiles and median', () => {
  near(mean([2, 4, 6]), 4)
  // Sample standard deviation (n - 1): sqrt(32 / 7)
  near(sd([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7))
  assert.equal(sd([5]), 0)
  // Linear interpolation, like R's default
  near(quantile([1, 2, 3, 4], 0.25), 1.75)
  near(quantile([1, 2, 3, 4], 0.75), 3.25)
  near(median([1, 2, 3, 4]), 2.5)
  near(median([9, 1, 5]), 5)
  assert.equal(quantile([5], 0.9), 5)
})

test('Spearman is 1 for a rising relation, -1 for a falling one, whatever the shape', () => {
  near(spearman([1, 2, 3, 4], [10, 20, 30, 45]), 1)
  near(spearman([1, 2, 3, 4], [1, 4, 9, 100]), 1)
  near(spearman([1, 2, 3, 4], [9, 7, 3, 1]), -1)
})

test('Spearman gives tied values their average rank', () => {
  // ranks of x: 1, 2.5, 2.5, 4
  near(spearman([1, 2, 2, 3], [1, 2, 3, 4]), 4.5 / Math.sqrt(22.5))
})

test('Spearman is undefined when one side never varies', () => {
  assert.ok(Number.isNaN(spearman([3, 3, 3, 3], [1, 2, 3, 4])))
})

test('the labels of a correlation change at 0.1, 0.3 and 0.5, for either sign', () => {
  assert.deepEqual([0.05, 0.1, 0.29, 0.3, 0.49, 0.5, 0.9].map(strengthIndex), [0, 1, 1, 2, 2, 3, 3])
  assert.deepEqual([-0.05, -0.3, -0.9].map(strengthIndex), [0, 2, 3])
})

// ---------------------------------------------------------------------------
// Periods

test('the period is compared with the same number of days right before it', () => {
  const p = reportPeriods('2026-09-15', '2026-09-28')
  assert.equal(p.periodDays, 14)
  assert.equal(p.prevStart, '2026-09-01')
  assert.equal(p.totalDays, 28)
  assert.equal(p.dayIndex('2026-09-01'), 0)
  assert.equal(p.dayIndex('2026-09-15'), 14)
  assert.equal(p.dayIndex('2026-09-28'), 27)
})

test('a consultation today makes a one-day period', () => {
  const p = reportPeriods('2026-09-28', '2026-09-28')
  assert.equal(p.periodDays, 1)
  assert.equal(p.prevStart, '2026-09-27')
})

test('entries are split at the consultation day, which belongs to the period', () => {
  const p = reportPeriods('2026-09-15', '2026-09-28')
  const entries = [
    entry('2026-08-31', 1), // before the comparison period
    entry('2026-09-01', 2),
    entry('2026-09-14', 3),
    entry('2026-09-15', 4),
    entry('2026-09-28', 5),
    entry('2026-09-29', 6), // after the end
  ]
  const { current, previous } = splitEntries(entries, p)
  assert.deepEqual(current.map((e) => e.painLevel), [4, 5])
  assert.deepEqual(previous.map((e) => e.painLevel), [2, 3])
})

test('entries come out sorted by date whatever their order', () => {
  const p = reportPeriods('2026-09-15', '2026-09-28')
  const { current } = splitEntries([entry('2026-09-20', 2), entry('2026-09-16', 1)], p)
  assert.deepEqual(current.map((e) => e.date), ['2026-09-16', '2026-09-20'])
})

// ---------------------------------------------------------------------------
// Pain

test('pain stats summarise the days logged', () => {
  const stats = painStats([0, 2, 4, 6, 8, 10].map((p, i) => entry(day(i), p)))!
  assert.equal(stats.n, 6)
  near(stats.mean, 5)
  near(stats.median, 5)
  near(stats.q1, 2.5)
  near(stats.q3, 7.5)
  assert.equal(stats.min, 0)
  assert.equal(stats.max, 10)
  near(stats.mild, 2 / 6)
  near(stats.moderate, 2 / 6)
  near(stats.severe, 2 / 6)
  assert.equal(stats.distribution.length, 11)
  near(stats.distribution[4], 1 / 6)
  near(stats.distribution.reduce((s, v) => s + v, 0), 1)
})

test('the three severity bands split at 3/4 and 6/7 and add up to everything', () => {
  const stats = painStats([3, 4, 6, 7].map((p, i) => entry(day(i), p)))!
  near(stats.mild, 0.25)
  near(stats.moderate, 0.5)
  near(stats.severe, 0.25)
})

test('without any entry there are no stats', () => {
  assert.equal(painStats([]), null)
})

test('a trailing mean needs enough known days in its window', () => {
  const means = trailingMeans([2, undefined, 4, undefined, undefined], 3, 2)
  assert.deepEqual(means, [null, null, 3, null, null])
  assert.deepEqual(trailingMeans([1, 2, 3, 4], 3, 2), [null, 1.5, 2, 3])
})

test('the rolling mean is placed on the chart span, before and during the period', () => {
  const p = reportPeriods('2026-09-05', '2026-09-06') // prevStart 09-03, 4 days
  const entries = [2, 4, 6, 8].map((v, i) => entry(`2026-09-0${3 + i}`, v))
  assert.deepEqual(rollingMean(entries, (e) => e.painLevel, p, 2, 2), [null, 3, 5, 7])
})

// ---------------------------------------------------------------------------
// Other symptoms, tags

test('the mean of a symptom ignores days without it', () => {
  const entries = [entry(day(0), 5, { fatigueLevel: 4 }), entry(day(1), 5), entry(day(2), 5, { fatigueLevel: 8 })]
  assert.deepEqual(meanOf(entries, 'fatigueLevel'), { mean: 6, n: 2 })
  assert.equal(meanOf(entries, 'brainFog'), null)
})

test('a symptom logged at 0 counts', () => {
  assert.deepEqual(meanOf([entry(day(0), 5, { moodLevel: 0 })], 'moodLevel'), { mean: 0, n: 1 })
})

test('tags are ranked by the share of days they appear, once per day', () => {
  const entries = [
    entry(day(0), 5, { positiveActions: ['a', 'b'] }),
    entry(day(1), 5, { positiveActions: ['a'] }),
    entry(day(2), 5, { positiveActions: ['a', 'a'] }),
    entry(day(3), 5),
  ]
  assert.deepEqual(tagShares(entries, (e) => e.positiveActions), [
    ['a', 0.75],
    ['b', 0.25],
  ])
})

// ---------------------------------------------------------------------------
// Medications

const period = (start: string, end?: string) => ({ start, end })
const med = (id: string, name: string, regimen: Medication['regimen'], periods: Medication['periods']): Medication => ({
  id,
  name,
  regimen,
  periods,
  createdAt: 0,
  updatedAt: 0,
})
const take = (n: number, ...intakes: MedicationIntake[]) => entry(day(n), 5, { intakes })

const duloxetine = med('d', 'Duloxétine', 'scheduled', [period('2026-01-01')])
const ibuprofen = med('i', 'Ibuprofène', 'asNeeded', [period('2026-01-01')])
const oldTreatment = med('o', 'Ancien', 'scheduled', [period('2025-01-01', '2026-08-01')])
const p = reportPeriods(day(14), day(27)) // prevStart is day(0)

test('a scheduled treatment counts the days taken, missed and without a count', () => {
  const entries = [
    take(14, { medicationId: 'd', doses: 1 }),
    take(15, { medicationId: 'd', doses: 1 }),
    take(16, { medicationId: 'd', doses: 0 }), // missed
    take(17, { medicationId: 'd' }), // taken, count unknown
    take(18, { medicationId: 'd', doses: 2 }),
    take(19, { medicationId: 'd', doses: 0 }), // missed
  ]
  const [report] = medicationReports(entries, [duloxetine], p)
  assert.equal(report.daysTaken, 4)
  assert.equal(report.daysMissed, 2)
  assert.equal(report.doses, 4)
  assert.equal(report.daysWithoutCount, 1)
  assert.equal(report.maxDosesInADay, 2)
})

test('relief and side effects are collected per treatment', () => {
  const entries = [
    take(14, { medicationId: 'i', doses: 2, relief: 3 }),
    take(15, { medicationId: 'i', doses: 1, relief: 0, sideEffects: ['nausée'] }),
    take(16, { medicationId: 'i', doses: 1, relief: 0, sideEffects: ['nausée', 'vertiges'] }),
  ]
  const [report] = medicationReports(entries, [ibuprofen], p)
  assert.deepEqual(report.relief, [2, 0, 0, 1])
  assert.deepEqual([...report.sideEffects], [
    ['nausée', [day(15), day(16)]],
    ['vertiges', [day(16)]],
  ])
})

test('a treatment active in the period is listed even without an intake, an ended one is not', () => {
  const reports = medicationReports([], [duloxetine, oldTreatment], p)
  assert.deepEqual(reports.map((r) => r.med.id), ['d'])
  assert.equal(reports[0].daysTaken, 0)
})

test('a stopped treatment that was still taken in the period is listed', () => {
  const reports = medicationReports([take(14, { medicationId: 'o', doses: 1 })], [oldTreatment], p)
  assert.deepEqual(reports.map((r) => r.med.id), ['o'])
})

test('scheduled treatments come first, then by name', () => {
  const zolpidem = med('z', 'Zolpidem', 'scheduled', [period('2026-01-01')])
  const reports = medicationReports([], [ibuprofen, zolpidem, duloxetine], p)
  assert.deepEqual(reports.map((r) => r.med.name), ['Duloxétine', 'Zolpidem', 'Ibuprofène'])
})

test('a dose change is reported when it started inside the charted span', () => {
  const changed = med('c', 'Changé', 'scheduled', [period('2026-01-01', '2026-09-09'), period('2026-09-10')])
  const [report] = medicationReports([], [changed], p)
  assert.deepEqual(report.changes.map((c) => c.start), ['2026-09-10'])
})

test('rescue days count as-needed and undescribed medications, but not scheduled ones or missed doses', () => {
  const other = med('u', 'Autre', 'unspecified', [period('2026-01-01')])
  const entries = [
    take(0, { medicationId: 'd', doses: 1 }), // scheduled only
    take(1, { medicationId: 'i', doses: 1 }),
    take(2, { medicationId: 'u' }), // taken, count unknown
    take(3, { medicationId: 'i', doses: 0 }), // marked as not taken
    take(4, { medicationId: 'd', doses: 1 }, { medicationId: 'i', doses: 2 }),
  ]
  assert.equal(daysWithRescueMedication(entries, [duloxetine, ibuprofen, other]), 3)
})

test('weekly rows cover the period and stop at its last day', () => {
  const short = reportPeriods('2026-09-15', '2026-09-25')
  const rows = weeklyRows([entry('2026-09-16', 4), entry('2026-09-18', 6), entry('2026-09-24', 8)], short)
  assert.deepEqual(rows.map((r) => [r.start, r.end, r.days, r.logged]), [
    ['2026-09-15', '2026-09-21', 7, 2],
    ['2026-09-22', '2026-09-25', 4, 1],
  ])
  assert.deepEqual(rows.map((r) => r.meanPain), [5, 8])
})

test('a week without any entry has no mean rather than 0', () => {
  const rows = weeklyRows([entry('2026-09-16', 4)], reportPeriods('2026-09-15', '2026-09-28'))
  assert.equal(rows[1].meanPain, null)
  assert.equal(rows[1].logged, 0)
})

test('weekly doses add up, a dose without a count being one', () => {
  const rows = weeklyRows(
    [
      take(14, { medicationId: 'i', doses: 2 }),
      take(15, { medicationId: 'i' }),
      take(21, { medicationId: 'i', doses: 1 }),
    ],
    p
  )
  assert.equal(rows[0].byMedication.get('i'), 3)
  assert.equal(rows[1].byMedication.get('i'), 1)
})

// ---------------------------------------------------------------------------
// Associations

const daily = (n: number, make: (i: number) => Partial<DailyEntry> & { painLevel: number }) =>
  Array.from({ length: n }, (_, i) => entry(day(i), 0, make(i)))

test('a factor that rises with pain has a correlation of 1', () => {
  const entries = daily(14, (i) => ({ painLevel: i % 10, stressLevel: (i % 10) * 2 }))
  const result = association(entries, 'stress', (e) => e.stressLevel)
  assert.equal(result?.key, 'stress')
  assert.equal(result?.n, 14)
  near(result?.rho, 1)
})

test('a factor that falls as pain rises has a negative correlation', () => {
  const entries = daily(14, (i) => ({ painLevel: i % 10, sleepQuality: 10 - (i % 10) }))
  near(association(entries, 'sleep', (e) => e.sleepQuality)?.rho, -1)
})

test('there is no correlation with too few days, or a factor that never varies', () => {
  assert.equal(association(daily(13, (i) => ({ painLevel: i % 10, stressLevel: i })), 's', (e) => e.stressLevel), null)
  assert.equal(association(daily(20, (i) => ({ painLevel: i % 10, stressLevel: 5 })), 's', (e) => e.stressLevel), null)
})

test('the day before is available, and a day without it is left out', () => {
  // Sleep of the night before: the first day has no previous entry.
  const entries = daily(15, (i) => ({ painLevel: i % 10, sleepHours: i % 10 }))
  const result = association(entries, 'sleepBefore', (_e, prev) => prev?.sleepHours)
  assert.equal(result?.n, 14)
})

test('the day before must be the calendar day before, not the previous entry', () => {
  const entries = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28].map((n, i) => entry(day(n), i, { sleepHours: i }))
  assert.equal(association(entries, 'x', (_e, prev) => prev?.sleepHours, 1), null)
})

test('pressure change is measured from the previous logged day, gaps included', () => {
  const w = (hpa?: number) => (hpa === undefined ? {} : { weather: { source: 'auto' as const, pressureHpa: hpa } })
  const entries = [entry(day(0), 1, w(1010)), entry(day(1), 1, w(1005)), entry(day(4), 1, w(1012)), entry(day(5), 1, w()), entry(day(6), 1, w(1000))]
  const get = pressureChange(entries)
  assert.equal(get(entries[0]), undefined)
  assert.equal(get(entries[1]), -5)
  assert.equal(get(entries[2]), 7)
  assert.equal(get(entries[3]), undefined)
  assert.equal(get(entries[4]), undefined)
})

test('pressure change does not depend on the order of the entries, and a stored delta wins', () => {
  const a = entry(day(0), 1, { weather: { source: 'auto', pressureHpa: 1000 } })
  const b = entry(day(1), 1, { weather: { source: 'auto', pressureHpa: 1004 } })
  const c = entry(day(2), 1, { weather: { source: 'auto', pressureHpa: 1004, pressureDeltaFromPrevious: -3 } })
  const get = pressureChange([c, a, b])
  assert.equal(get(b), 4)
  assert.equal(get(c), -3)
})

test('real-data pressure feeds the association once there are 14 days with a previous value', () => {
  const entries = daily(15, (i) => ({ painLevel: i % 10, weather: { source: 'auto', pressureHpa: 1000 + (i % 10) * (i % 10) } }))
  assert.equal(association(entries, 'pressure', pressureChange(entries))?.n, 14)
})

test('a context is compared by the median pain with and without it', () => {
  const entries = [
    ...[6, 7, 8].map((v, i) => entry(day(i), v, { periodDay: true })),
    ...[2, 3, 4, 9].map((v, i) => entry(day(3 + i), v, { periodDay: false })),
    entry(day(7), 10), // unknown: in neither group
  ]
  assert.deepEqual(compareContext(entries, 'period', (e) => e.periodDay), {
    key: 'period',
    withMedian: 7,
    withN: 3,
    withoutMedian: 3.5,
    withoutN: 4,
  })
})

test('no comparison when one side has fewer than three days', () => {
  const entries = [entry(day(0), 6, { periodDay: true }), ...[1, 2, 3].map((i) => entry(day(i), 3, { periodDay: false }))]
  assert.equal(compareContext(entries, 'period', (e) => e.periodDay), null)
})

test('collapseDoublePeriod: an abbreviated month before a closing period prints one dot', () => {
  assert.equal(collapseDoublePeriod('Dose changée le 11 sept..'), 'Dose changée le 11 sept.')
  assert.equal(collapseDoublePeriod('Début le 3 oct.. (efficace)'), 'Début le 3 oct. (efficace)')
  assert.equal(collapseDoublePeriod('Arrêt le 5 mai.'), 'Arrêt le 5 mai.')
})
