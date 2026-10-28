// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry, Medication } from '../src/db/types.ts'
import { csvCell, intakesCsv, journalCsv } from '../src/lib/csvExport.ts'

const entry = (date: string, extra: Partial<DailyEntry> = {}): DailyEntry => ({ date, createdAt: 0, updatedAt: 0, ...extra })
const med = (id: string, name: string, regimen: Medication['regimen'], periods: Medication['periods']): Medication => ({
  id,
  name,
  regimen,
  periods,
  createdAt: 0,
  updatedAt: 0,
})

test('cells are quoted when they hold a comma, a quote or a line break, and quotes are doubled', () => {
  assert.equal(csvCell('simple'), 'simple')
  assert.equal(csvCell('a, b'), '"a, b"')
  assert.equal(csvCell('il a dit "oui"'), '"il a dit ""oui"""')
  assert.equal(csvCell('deux\nlignes'), '"deux\nlignes"')
  assert.equal(csvCell(undefined), '')
})

test('numbers and booleans are written plainly: decimal point, 1 and 0, negatives untouched', () => {
  assert.equal(csvCell(7), '7')
  assert.equal(csvCell(21.5), '21.5')
  assert.equal(csvCell(-3), '-3')
  assert.equal(csvCell(true), '1')
  assert.equal(csvCell(false), '0')
  assert.equal(csvCell(Number.NaN), '')
})

test('text that begins like a formula is shown, not computed', () => {
  for (const text of ['=SUM(A1:A9)', '+33 6 12', '-2 jours', '@maxime', '\tindent']) assert.ok(csvCell(text).startsWith("'") || csvCell(text).startsWith('"\''), text)
  assert.equal(csvCell('=1+1'), "'=1+1")
  assert.equal(csvCell('a=b'), 'a=b')
})

test('the journal has one row per day, oldest first, an empty cell for what was not noted', () => {
  const csv = journalCsv(
    [
      entry('2026-10-02', { painLevel: 6, fatigueLevel: 7, sleepHours: 5.5, periodDay: false, painLocations: ['lowerBack', 'neck'], weather: { source: 'auto', condition: 'pluvieux', tempC: -1.5, pressureHpa: 1012 }, notes: 'Dur, très dur' }),
      entry('2026-10-01', { notes: 'seulement une note' }),
    ],
    { includeNotes: true }
  )
  const rows = csv.split('\r\n')
  assert.equal(rows.at(-1), '')
  assert.equal(rows[0], 'date,pain,fatigue,sleep_quality,sleep_hours,stress,brain_fog,mood,activity,period_day,weather_source,weather_condition,temperature_c,pressure_hpa,pain_locations,positive_actions,morning_stiffness,morning_stiffness_severity,notes')
  assert.equal(rows[1], '2026-10-01,,,,,,,,,,,,,,,,,,seulement une note')
  assert.equal(rows[2], '2026-10-02,6,7,,5.5,,,,,0,auto,pluvieux,-1.5,1012,lowerBack|neck,,,,"Dur, très dur"')
})

test('without the notes, the column is gone and their text is nowhere', () => {
  const csv = journalCsv([entry('2026-10-01', { painLevel: 4, notes: 'privé' })], { includeNotes: false })
  assert.ok(!csv.includes('notes'))
  assert.ok(!csv.includes('privé'))
  assert.equal(csv.split('\r\n')[1], '2026-10-01,4,,,,,,,,,,,,,,,,')
})

test('the intakes have one row per intake with the posology of that day', () => {
  const meds = [
    med('d', 'Duloxétine', 'scheduled', [{ start: '2026-01-01', end: '2026-09-30', dose: { amount: 30, unit: 'mg' } }, { start: '2026-10-01', dose: { amount: 60, unit: 'mg' } }]),
    med('p', 'Paracétamol', 'asNeeded', [{ start: '2025-01-01', dose: { amount: 1, unit: 'g' } }]),
    med('u', 'Magnésium', 'unspecified', [{ start: '2026-01-01' }]),
  ]
  const csv = intakesCsv(
    [
      entry('2026-10-02', { intakes: [{ medicationId: 'd', doses: 0 }, { medicationId: 'p', doses: 2, relief: 3, sideEffects: ['nausées', 'vertiges'] }] }),
      entry('2026-09-15', { intakes: [{ medicationId: 'd' }, { medicationId: 'u' }] }),
    ],
    meds
  )
  assert.deepEqual(csv.split('\r\n'), [
    'date,medication,medication_id,regimen,dose_amount,dose_unit,doses,taken,relief,side_effects',
    '2026-09-15,Duloxétine,d,scheduled,30,mg,,1,,',
    '2026-09-15,Magnésium,u,unspecified,,,,1,,',
    '2026-10-02,Duloxétine,d,scheduled,60,mg,0,0,,',
    '2026-10-02,Paracétamol,p,asNeeded,1,g,2,1,3,nausées|vertiges',
    '',
  ])
})

test('an intake of a medication no longer in the list keeps its id and loses only the name', () => {
  const csv = intakesCsv([entry('2026-10-02', { intakes: [{ medicationId: 'gone', doses: 1 }] })], [])
  assert.equal(csv.split('\r\n')[1], '2026-10-02,,gone,,,,1,1,,')
})

test('the morning stiffness goes out as its band and its 0-10 intensity, before the notes', () => {
  const csv = journalCsv([entry('2026-10-01', { morningStiffness: '1to2h', morningStiffnessSeverity: 6, notes: 'x' })], { includeNotes: true })
  const [header, row] = csv.split('\r\n')
  assert.deepEqual(header!.split(',').slice(-3), ['morning_stiffness', 'morning_stiffness_severity', 'notes'])
  assert.deepEqual(row!.split(',').slice(-3), ['1to2h', '6', 'x'])
})
