// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyEntry, Medication } from '../src/db/types.ts'
import { shiftISO } from '../src/lib/dates.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'
import {
  careSheetFromBackup, cleanAllergies, cleanCareSheet, cleanContacts, cleanPhone, currentMedications, notedEffects, painRange, helperIn, usualHelpers, usualPain, usualZones,
} from '../src/lib/careSheet.ts'

const today = '2026-11-09'
const entry = (n: number, painLevel: number | undefined, extra: Partial<DailyEntry> = {}): DailyEntry => ({
  date: shiftISO(today, -n), painLevel, createdAt: 0, updatedAt: 0, ...extra,
})
const days = (count: number, level: (i: number) => number, extra: (i: number) => Partial<DailyEntry> = () => ({})) =>
  Array.from({ length: count }, (_, i) => entry(i, level(i), extra(i)))
const med = (id: string, name: string, over: Partial<Medication> = {}): Medication => ({
  id, name, regimen: 'scheduled', periods: [{ start: '2026-01-01' }], createdAt: 0, updatedAt: 0, ...over,
})

test('allergies are tidied: spaces, empties, repeats (case aside), at most eight', () => {
  assert.deepEqual(cleanAllergies(['  Pénicilline  ', '', 'pénicilline', 'Latex\n']), ['Pénicilline', 'Latex'])
  assert.equal(cleanAllergies(Array.from({ length: 12 }, (_, i) => `a${i}`)).length, 8)
})

test('a number keeps its digits and signs and loses anything else', () => {
  assert.equal(cleanPhone('06 12 34 56 78 <b>'), '06 12 34 56 78')
  assert.equal(cleanPhone('+33 (0)6.12-34'), '+33 (0)6.12-34')
})

test('a contact needs a name; a number alone is dropped; three at most', () => {
  assert.deepEqual(cleanContacts([{ label: ' ', phone: '0612' }, { label: 'Alex, conjoint', phone: '06 12' }, { label: 'Dr Martin' }]), [
    { label: 'Alex, conjoint', phone: '06 12' },
    { label: 'Dr Martin' },
  ])
  assert.equal(cleanContacts(Array.from({ length: 5 }, (_, i) => ({ label: `c${i}` }))).length, 3)
})

test('an empty form leaves nothing; a word is cut to 280 characters', () => {
  assert.equal(cleanCareSheet({ allergies: [' '], contacts: [{ label: '' }], note: '  ' }), undefined)
  assert.equal(cleanCareSheet({ note: 'x'.repeat(400) })?.note?.length, 280)
})

test('a backup file keeps only what the sheet holds', () => {
  assert.equal(careSheetFromBackup('x'), undefined)
  assert.equal(careSheetFromBackup(null), undefined)
  assert.deepEqual(careSheetFromBackup({ allergies: ['Latex', 3], contacts: [{ label: 'Alex', phone: 12 }, 'bad'], note: 'Bruit', extra: 1 }), {
    allergies: ['Latex'], contacts: [{ label: 'Alex' }], note: 'Bruit',
  })
  const s = sanitizeSettings({ careSheet: { allergies: ['Latex'], contacts: [] } })
  assert.deepEqual(s?.careSheet, { allergies: ['Latex'], contacts: [] })
})

test('the usual pain is the middle half of the logged days, rounded', () => {
  const list = days(20, (i) => (i % 2 ? 4 : 5))
  assert.deepEqual(usualPain(list, today), { low: 4, high: 5, days: 20 })
  assert.equal(painRange({ low: 5, high: 5 }, 'à'), '5')
  assert.equal(painRange({ low: 4, high: 5 }, 'à'), '4 à 5')
})

test('under 14 logged days the journal says nothing of what is usual', () => {
  assert.equal(usualPain(days(13, () => 5), today), null)
  assert.deepEqual(usualZones(days(13, () => 5, () => ({ painLocations: ['lowerBack'] })), today), [])
})

test('days with no pain level and days older than 90 are not counted', () => {
  const list = [...days(14, () => 6), entry(1, undefined), entry(100, 0), entry(95, 0)]
  assert.deepEqual(usualPain(list, today), { low: 6, high: 6, days: 14 })
})

test('the zones listed are those reported on a fifth of the days, most frequent first, three at most', () => {
  const list = days(20, () => 4, (i) => ({ painLocations: i < 10 ? ['lowerBack', 'neck'] : i < 14 ? ['neck'] : [] }))
  assert.deepEqual(usualZones(list, today), ['neck', 'lowerBack'])
  const rare = days(20, () => 4, (i) => ({ painLocations: i === 0 ? ['neck'] : [] }))
  assert.deepEqual(usualZones(rare, today), [])
})

test('what helps needs three days; repeats in case are one; kept as first typed', () => {
  const list = days(20, () => 4, (i) => ({ positiveActions: i < 5 ? ['Bain chaud'] : i < 9 ? ['bain chaud', 'Marche'] : i < 11 ? ['Marche'] : [] }))
  assert.deepEqual(usualHelpers(list, today), ['Bain chaud', 'Marche'])
  // the app's own suggestions follow the language of the sheet, and count together
  const mixed = days(20, () => 4, (i) => ({ positiveActions: [i % 2 ? 'Warm bath' : 'Bain chaud', 'Ma tisane'] }))
  assert.deepEqual(usualHelpers(mixed, today, 3, 'en'), ['Ma tisane', 'Warm bath / shower'])
  assert.deepEqual(usualHelpers(mixed, today, 3, 'fr'), ['Bain / douche chaude', 'Ma tisane'])
  // the bath suggestion was worded "Bain chaud" before: entries already stored count with the new one
  assert.equal(helperIn('Bain chaud', 'en'), 'Warm bath / shower')
  assert.equal(helperIn('Warm bath / shower', 'fr'), 'Bain / douche chaude')
  const two = days(20, () => 4, (i) => ({ positiveActions: i < 3 ? ['Marche'] : [] }))
  assert.deepEqual(usualHelpers(two, today), ['Marche'])
  assert.deepEqual(usualHelpers(days(20, () => 4, (i) => ({ positiveActions: i < 2 ? ['Marche'] : [] })), today), [])
})

test('current treatments leave out the stopped ones, scheduled first', () => {
  const list = currentMedications([
    med('a', 'Paracétamol', { regimen: 'asNeeded' }),
    med('b', 'Tramadol', { periods: [{ start: '2026-01-01', end: '2026-03-01', stopReason: 'sideEffects' }] }),
    med('c', 'Duloxétine'),
  ])
  assert.deepEqual(list.map((m) => m.name), ['Duloxétine', 'Paracétamol'])
})

test('the side effects noted are listed per treatment, with the stops for that reason', () => {
  const meds = [
    med('a', 'Tramadol', { periods: [{ start: '2026-01-01', end: '2026-03-01', stopReason: 'sideEffects' }] }),
    med('b', 'Duloxétine'),
    med('c', 'Paracétamol'),
  ]
  const entries = [
    { intakes: [{ medicationId: 'a', sideEffects: ['Nausées'] }, { medicationId: 'b', sideEffects: [] }] },
    { intakes: [{ medicationId: 'a', sideEffects: ['nausées', 'Vertiges'] }] },
  ]
  assert.deepEqual(notedEffects(meds, entries), [{ name: 'Tramadol', effects: ['Nausées', 'Vertiges'], stoppedForEffects: true }])
  assert.deepEqual(notedEffects([med('d', 'X', { periods: [{ start: '2026-01-01', end: '2026-02-01', stopReason: 'sideEffects' }] })], []), [
    { name: 'X', effects: [], stoppedForEffects: true },
  ])
})

test('age counts whole years and waits for the birthday', async () => {
  const { ageOn } = await import('../src/lib/careSheet.ts')
  assert.equal(ageOn('1984-11-09', '2026-11-09'), 42)
  assert.equal(ageOn('1984-11-10', '2026-11-09'), 41)
  assert.equal(ageOn(undefined, '2026-11-09'), null)
  assert.equal(ageOn('2030-01-01', '2026-11-09'), null)
})
