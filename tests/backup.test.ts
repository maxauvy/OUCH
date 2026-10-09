// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decryptJSON, encryptJSON, isEncryptedPayload } from '../src/lib/crypto.ts'
import { isISODate, sanitizeBackup, sanitizeEntry, sanitizeMedication, sanitizeSettings } from '../src/lib/backupSanitize.ts'

const entry = { date: '2026-05-04', painLevel: 6, createdAt: 1, updatedAt: 2 }

test('a well-formed entry is kept as it is', () => {
  const full = {
    ...entry,
    fatigueLevel: 4,
    sleepHours: 7.5,
    weather: { source: 'auto', condition: 'pluvieux', tempC: 12, pressureHpa: 1008 },
    intakes: [{ medicationId: 'm1', doses: 2, relief: 3, sideEffects: ['nausea'] }],
    painLocations: ['head', 'lowerBack'],
    periodDay: false,
    notes: 'bad night',
  }
  assert.deepEqual(sanitizeEntry(full), full)
})

test('a day without a pain level is kept without one: it is not a day of 0', () => {
  const out = sanitizeEntry({ date: '2026-05-04', painLocations: ['neck'], createdAt: 1, updatedAt: 2 })
  assert.deepEqual(out, { date: '2026-05-04', painLocations: ['neck'], createdAt: 1, updatedAt: 2 })
  assert.equal(sanitizeEntry({ ...entry, painLevel: null })?.painLevel, undefined)
  assert.equal(sanitizeEntry({ ...entry, painLevel: 0 })?.painLevel, 0)
})

test('entries without a usable day, or with an unusable pain level, are skipped', () => {
  for (const bad of [
    null,
    'x',
    [],
    { ...entry, date: undefined },
    { ...entry, date: '2026-02-30' },
    { ...entry, date: '04/05/2026' },
    { ...entry, date: { toString: () => '2026-05-04' } },
    { ...entry, painLevel: '6' },
    { ...entry, painLevel: 11 },
    { ...entry, painLevel: NaN },
    { ...entry, painLevel: Infinity },
    { ...entry, painLevel: true },
  ]) {
    assert.equal(sanitizeEntry(bad), null, JSON.stringify(bad))
  }
})

test('wrongly typed optional fields are dropped instead of stored', () => {
  const out = sanitizeEntry({
    ...entry,
    intakes: 'not a list',
    painLocations: { length: 3 },
    positiveActions: [1, 'walk', null],
    weather: 'sunny',
    fatigueLevel: '5',
    sleepHours: 99,
    notes: 42,
    periodDay: 'yes',
  })
  assert.deepEqual(out, { ...entry, positiveActions: ['walk'] })
})

test('unknown keys, including __proto__ and an id, never reach the database', () => {
  const raw = JSON.parse(
    '{"date":"2026-05-04","painLevel":3,"id":99,"__proto__":{"polluted":true},"constructor":{"x":1},"extra":"x"}'
  )
  const out = sanitizeEntry(raw, 5)
  assert.deepEqual(out, { date: '2026-05-04', painLevel: 3, createdAt: 5, updatedAt: 5 })
  assert.equal(({} as Record<string, unknown>).polluted, undefined)
})

test('intakes and zones are filtered item by item', () => {
  const out = sanitizeEntry({
    ...entry,
    intakes: [{ medicationId: 'ok', relief: 9, doses: -1 }, { medicationId: 3 }, null, 'x'],
    painLocations: ['head', 'toe', 7],
  })
  assert.deepEqual(out?.intakes, [{ medicationId: 'ok' }])
  assert.deepEqual(out?.painLocations, ['head'])
})

test('long text is truncated', () => {
  const out = sanitizeEntry({ ...entry, notes: 'a'.repeat(50_000) })
  assert.equal(out?.notes?.length, 10_000)
})

test('medications need an id and a name; the rest is repaired or dropped', () => {
  assert.equal(sanitizeMedication({ name: 'x' }), null)
  assert.equal(sanitizeMedication({ id: 'a', name: '   ' }), null)
  const med = sanitizeMedication(
    {
      id: 'a',
      name: ' Doliprane ',
      regimen: 'weird',
      periods: [
        { start: '2026-01-01', end: 'never', dose: { amount: 500, unit: 'mg' }, perDay: 3 },
        { start: 'yesterday' },
        { start: '2026-02-01', dose: { amount: 'lots', unit: 'mg' } },
      ],
    },
    7
  )
  assert.deepEqual(med, {
    id: 'a',
    name: 'Doliprane',
    regimen: 'unspecified',
    periods: [{ start: '2026-01-01', dose: { amount: 500, unit: 'mg' }, perDay: 3 }, { start: '2026-02-01' }],
    createdAt: 7,
    updatedAt: 7,
  })
})

test('settings keep only valid values and never invent any', () => {
  assert.equal(sanitizeSettings('x'), undefined)
  assert.deepEqual(sanitizeSettings({}), {})
  assert.deepEqual(
    sanitizeSettings({
      theme: 'dark',
      design: 'neon',
      reminderTime: '25:99',
      autoWeatherLat: 500,
      autoWeatherLon: 2.35,
      illnesses: ['migraine', 'plague'],
      enabledFactors: ['sleep', 'cycle', 'bogus'],
      language: 'de',
      displayName: 12,
    }),
    { theme: 'dark', autoWeatherLon: 2.35, illnesses: ['migraine'], enabledFactors: ['sleep', 'cycle'] }
  )
  assert.equal(sanitizeSettings({ reminderTime: '07:30' })?.reminderTime, '07:30')
})

test('the hard-days switch is restored from a backup, which flare it was shown for is not', () => {
  const out = sanitizeSettings({ hardDaysCardEnabled: false, hardDaysSeen: { start: '2026-10-01', date: '2026-10-05', dismissed: true } })
  assert.deepEqual(out, { hardDaysCardEnabled: false })
  assert.deepEqual(sanitizeSettings({ hardDaysCardEnabled: 'no' }), {})
})

test('the lighter-form switch is restored from a backup, the day the full form was asked for is not', () => {
  assert.deepEqual(sanitizeSettings({ lightFormEnabled: false, fullFormDay: '2026-10-06' }), { lightFormEnabled: false })
  assert.deepEqual(sanitizeSettings({ lightFormEnabled: 'no' }), {})
})

test('a whole backup: bad items are counted, good ones survive', () => {
  const out = sanitizeBackup({
    entries: [entry, { ...entry, date: 'nope' }, 3],
    medications: [{ id: 'a', name: 'X' }, {}],
    settings: { theme: 'light' },
  })
  assert.equal(out?.entries.length, 1)
  assert.equal(out?.medications.length, 1)
  assert.equal(out?.skipped, 3)
  assert.deepEqual(out?.settings, { theme: 'light' })
})

test('content that is not a backup, or absurdly large, is refused', () => {
  for (const bad of [null, 'x', 5, [], {}, { entries: 'no' }, { entries: { length: 1 } }]) {
    assert.equal(sanitizeBackup(bad), null)
  }
  assert.equal(sanitizeBackup({ entries: new Array(40_001).fill(entry) }), null)
})

test('isISODate only accepts real calendar days', () => {
  assert.ok(isISODate('2024-02-29'))
  assert.ok(!isISODate('2025-02-29'))
  assert.ok(!isISODate('2025-13-01'))
  assert.ok(!isISODate(20250101))
})

test('an encrypted backup round-trips, and the password matters', async () => {
  const payload = await encryptJSON({ entries: [entry] }, 'correct horse')
  assert.ok(isEncryptedPayload(payload))
  assert.deepEqual(await decryptJSON(payload, 'correct horse'), { entries: [entry] })
  await assert.rejects(decryptJSON(payload, 'wrong'))
})

test('crafted payloads are refused before any key derivation', async () => {
  const good = await encryptJSON({ entries: [] }, 'pw')
  const refused = [
    null,
    'x',
    {},
    { ...good, magic: 'OUCH2' },
    { ...good, iterations: 2_000_000_000 },
    { ...good, iterations: 2_000_001 },
    { ...good, iterations: 1 },
    { ...good, iterations: '600000' },
    { ...good, iterations: 600_000.5 },
    { ...good, salt: 'AAAA' },
    { ...good, iv: 42 },
    { ...good, ciphertext: '***' },
  ]
  for (const bad of refused) assert.equal(isEncryptedPayload(bad), false, JSON.stringify(bad)?.slice(0, 80))
  const started = Date.now()
  await assert.rejects(decryptJSON({ ...good, iterations: 2_000_000_000 }, 'pw'))
  assert.ok(Date.now() - started < 1_000, 'must fail fast, not derive a key')
})

test('files from before the iteration count was stored are still accepted', async () => {
  const { iterations: _dropped, ...legacy } = await encryptJSON({}, 'pw')
  assert.ok(isEncryptedPayload(legacy))
})
