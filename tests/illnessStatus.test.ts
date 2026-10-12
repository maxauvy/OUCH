// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanOtherName, kidsIllnesses, OTHER_ILLNESS_NAME_MAX, parseDiagnosisYear, setIllnessStatus, setIllnessYear, toggleIllness } from '../src/lib/illnessStatus.ts'
import { formatIllnessList } from '../src/lib/childView.ts'
import { sanitizeSettings } from '../src/lib/backupSanitize.ts'

test('ticking an illness adds it, with no status: nothing is assumed', () => {
  assert.deepEqual(toggleIllness({ illnesses: ['fibromyalgie'] }, 'migraine'), { illnesses: ['fibromyalgie', 'migraine'] })
})

test('unticking drops the illness and its status, and the typed name for "autre"', () => {
  const state = { illnesses: ['fibromyalgie', 'autre'] as const, illnessStatus: { fibromyalgie: 'diagnosed', autre: 'suspected' } as const, otherIllnessName: 'SAPHO' }
  const patch = toggleIllness({ ...state, illnesses: [...state.illnesses] }, 'autre')
  assert.deepEqual(patch.illnesses, ['fibromyalgie'])
  assert.deepEqual(patch.illnessStatus, { fibromyalgie: 'diagnosed' })
  assert.ok('otherIllnessName' in patch && patch.otherIllnessName === undefined)
})

test('choosing a status sets it, changing it replaces it, choosing it again clears it', () => {
  const base = { illnesses: ['fibromyalgie' as const] }
  const set = setIllnessStatus(base, 'fibromyalgie', 'suspected')
  assert.deepEqual(set.illnessStatus, { fibromyalgie: 'suspected' })
  const changed = setIllnessStatus({ ...base, ...set }, 'fibromyalgie', 'diagnosed')
  assert.deepEqual(changed.illnessStatus, { fibromyalgie: 'diagnosed' })
  const cleared = setIllnessStatus({ ...base, ...changed }, 'fibromyalgie', 'diagnosed')
  assert.deepEqual(cleared.illnessStatus, {})
})

test('the typed name is trimmed and cut; empty means none', () => {
  assert.equal(cleanOtherName('  Rhumatisme psoriasique '), 'Rhumatisme psoriasique')
  assert.equal(cleanOtherName('   '), undefined)
  assert.equal(cleanOtherName('x'.repeat(200))?.length, OTHER_ILLNESS_NAME_MAX)
})

test('the Kids tab gives a suspected illness the general text, once', () => {
  assert.deepEqual(kidsIllnesses(['fibromyalgie', 'arthrite'], { arthrite: 'suspected' }), ['fibromyalgie', 'autre'])
  assert.deepEqual(kidsIllnesses(['arthrite', 'migraine'], { arthrite: 'suspected', migraine: 'suspected' }), ['autre'])
  assert.deepEqual(kidsIllnesses(['fibromyalgie', 'autre'], { fibromyalgie: 'suspected' }), ['autre'])
  assert.deepEqual(kidsIllnesses(['fibromyalgie', 'arthrite'], { arthrite: 'diagnosed' }), ['fibromyalgie', 'arthrite'])
  assert.deepEqual(kidsIllnesses(['migraine'], undefined), ['migraine'])
})

test('the report lists each illness with the status declared, and nothing for the others', () => {
  const list = formatIllnessList('fr', ['fibromyalgie', 'arthrite', 'migraine'], { status: { fibromyalgie: 'diagnosed', arthrite: 'suspected' } })
  assert.equal(list, 'Fibromyalgie (diagnostiquée), polyarthrite rhumatoïde (suspectée) et migraine')
  assert.equal(formatIllnessList('en', ['arthrite'], { status: { arthrite: 'suspected' } }), 'Rheumatoid arthritis (suspected)')
  assert.equal(formatIllnessList('fr', ['fibromyalgie', 'migraine']), 'Fibromyalgie et migraine')
})

test('the name typed for "autre" is used as typed, even an acronym, and "autre" is generic without it', () => {
  assert.equal(formatIllnessList('fr', ['fibromyalgie', 'autre'], { otherName: 'SAPHO', status: { autre: 'diagnosed' } }), 'Fibromyalgie et SAPHO (diagnostiquée)')
  assert.equal(formatIllnessList('fr', ['autre'], { otherName: 'Rhumatisme psoriasique' }), 'Rhumatisme psoriasique')
  assert.equal(formatIllnessList('fr', ['fibromyalgie', 'autre']), 'Fibromyalgie et autre maladie chronique')
})

test('a backup restores statuses for known illnesses and a cut name, and drops the rest', () => {
  const out = sanitizeSettings({ illnessStatus: { fibromyalgie: 'diagnosed', arthrite: 'maybe', inconnue: 'diagnosed' }, otherIllnessName: `  ${'y'.repeat(100)}` })
  assert.ok(out)
  assert.deepEqual(out.illnessStatus, { fibromyalgie: 'diagnosed' })
  assert.equal(out.otherIllnessName?.length, OTHER_ILLNESS_NAME_MAX)
  assert.deepEqual(sanitizeSettings({ illnessStatus: 'x', otherIllnessName: 3 }), {})
})

test('a diagnosis year is four digits from 1900 to this year; empty means not given', () => {
  assert.equal(parseDiagnosisYear('2019', 2026), 2019)
  assert.equal(parseDiagnosisYear(' 1900 ', 2026), 1900)
  assert.equal(parseDiagnosisYear('2026', 2026), 2026)
  assert.equal(parseDiagnosisYear('', 2026), null)
  assert.equal(parseDiagnosisYear('  ', 2026), null)
  for (const bad of ['2027', '1899', '19', '20190', 'deux mille', '2019.5', '-2019']) assert.equal(parseDiagnosisYear(bad, 2026), undefined, bad)
})

test('the year is set per illness, and null clears it', () => {
  const base = { illnesses: ['fibromyalgie' as const, 'migraine' as const], illnessStatus: { fibromyalgie: 'diagnosed' as const }, illnessYear: { migraine: 2010 } }
  assert.deepEqual(setIllnessYear(base, 'fibromyalgie', 2019).illnessYear, { migraine: 2010, fibromyalgie: 2019 })
  assert.deepEqual(setIllnessYear(base, 'migraine', null).illnessYear, {})
})

test('the year only goes with "diagnosed": suspecting, clearing or unticking drops it', () => {
  const base = { illnesses: ['fibromyalgie' as const], illnessStatus: { fibromyalgie: 'diagnosed' as const }, illnessYear: { fibromyalgie: 2019 } }
  assert.deepEqual(setIllnessStatus(base, 'fibromyalgie', 'suspected').illnessYear, {})
  assert.deepEqual(setIllnessStatus(base, 'fibromyalgie', 'diagnosed').illnessYear, {})
  assert.equal(toggleIllness(base, 'fibromyalgie').illnessYear && Object.keys(toggleIllness(base, 'fibromyalgie').illnessYear!).length, 0)
  // Choosing "diagnosed" again from "suspected" keeps what is there (nothing).
  assert.equal(setIllnessStatus({ ...base, illnessStatus: { fibromyalgie: 'suspected' }, illnessYear: {} }, 'fibromyalgie', 'diagnosed').illnessYear, undefined)
})

test('the report says when it was diagnosed, only for a diagnosed illness', () => {
  const status = { fibromyalgie: 'diagnosed', arthrite: 'suspected' } as const
  assert.equal(
    formatIllnessList('fr', ['fibromyalgie', 'arthrite'], { status, year: { fibromyalgie: 2019, arthrite: 2021 } }),
    'Fibromyalgie (diagnostiquée en 2019) et polyarthrite rhumatoïde (suspectée)'
  )
  assert.equal(formatIllnessList('en', ['fibromyalgie'], { status, year: { fibromyalgie: 2019 } }), 'Fibromyalgia (diagnosed in 2019)')
  assert.equal(formatIllnessList('fr', ['fibromyalgie'], { status }), 'Fibromyalgie (diagnostiquée)')
  assert.equal(formatIllnessList('fr', ['autre'], { otherName: 'SAPHO', status: { autre: 'diagnosed' }, year: { autre: 2015 } }), 'SAPHO (diagnostiquée en 2015)')
})

test('a backup restores a year for a diagnosed illness only, and only a real one', () => {
  const thisYear = new Date().getFullYear()
  const out = sanitizeSettings({
    illnessStatus: { fibromyalgie: 'diagnosed', arthrite: 'suspected', migraine: 'diagnosed', lombalgie: 'diagnosed' },
    illnessYear: { fibromyalgie: 2019, arthrite: 2020, migraine: thisYear + 1, lombalgie: 2010.5, inconnue: 2000 },
  })
  assert.ok(out)
  assert.deepEqual(out.illnessYear, { fibromyalgie: 2019 })
  assert.deepEqual(sanitizeSettings({ illnessYear: { fibromyalgie: 2019 } }), {})
})
