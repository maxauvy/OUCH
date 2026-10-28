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

test('the morning stiffness survives a backup: every band, and its intensity', () => {
  for (const band of ['none', 'lt30', '30to60', '1to2h', 'gt2h']) {
    const e = { ...entry, morningStiffness: band, morningStiffnessSeverity: 7 }
    assert.deepEqual(sanitizeEntry(e), e, band)
  }
  assert.equal(sanitizeEntry({ ...entry, morningStiffnessSeverity: 0 })?.morningStiffnessSeverity, 0)
})

test('the night wakings and the interference survive a backup, 0 included', () => {
  for (const nightWakings of [0, 1, 2, 3]) assert.deepEqual(sanitizeEntry({ ...entry, nightWakings, dailyInterference: 4 }), { ...entry, nightWakings, dailyInterference: 4 })
  assert.equal(sanitizeEntry({ ...entry, dailyInterference: 0 })?.dailyInterference, 0)
})

test('a number of wakings off the 0-3 choices, or an interference off the scale, is dropped', () => {
  for (const bad of [4, -1, 1.5, '2', null]) assert.equal(sanitizeEntry({ ...entry, nightWakings: bad })?.nightWakings, undefined, String(bad))
  assert.equal(sanitizeEntry({ ...entry, dailyInterference: 11 })?.dailyInterference, undefined)
})

test('the keys of the new indicators survive a settings backup', () => {
  assert.deepEqual(sanitizeSettings({ enabledFactors: ['sleep', 'nightWaking', 'dailyInterference'] })?.enabledFactors, ['sleep', 'nightWaking', 'dailyInterference'])
})

test('the P1 indicators survive a backup as they were written', () => {
  const full = {
    ...entry,
    wakingRefreshed: 'little',
    jointsFelt: { yes: true, joints: ['leftWrist', 'rightKnee'] },
    periodFlow: 'light',
    offCycleBleeding: false,
    bowelPain: true,
    urinary: false,
    headache: { today: true, duration: '4to24h', aura: false, nausea: true, sensitivity: true, triggers: ['stress'], acuteMed: true },
  }
  assert.deepEqual(sanitizeEntry(full), full)
  assert.deepEqual(sanitizeEntry({ ...entry, jointsFelt: { yes: false } })?.jointsFelt, { yes: false })
  assert.deepEqual(sanitizeEntry({ ...entry, headache: { today: false } })?.headache, { today: false })
})

test('bad P1 values are dropped field by field, never an error', () => {
  const out = sanitizeEntry({
    ...entry,
    wakingRefreshed: 'maybe',
    periodFlow: 'flood',
    bowelPain: 'yes',
    jointsFelt: { yes: true, joints: ['leftWrist', 'leftShoulder', 'leftWrist', 7] },
    headache: { today: true, duration: 'forever', aura: 1, triggers: ['wine', 3] },
  })
  assert.equal(out?.wakingRefreshed, undefined)
  assert.equal(out?.periodFlow, undefined)
  assert.equal(out?.bowelPain, undefined)
  assert.deepEqual(out?.jointsFelt, { yes: true, joints: ['leftWrist'] })
  assert.deepEqual(out?.headache, { today: true, triggers: ['wine'] })
  assert.equal(out?.painLevel, 6)
  // Without a boolean "yes" the answer means nothing.
  assert.equal(sanitizeEntry({ ...entry, jointsFelt: { joints: ['leftWrist'] }, headache: {} })?.jointsFelt, undefined)
})

test('details of a day without a headache, or without a "yes" for the joints, are not kept', () => {
  const out = sanitizeEntry({ ...entry, headache: { today: false, aura: true, acuteMed: true }, jointsFelt: { yes: false, joints: ['leftWrist'] } })
  assert.deepEqual(out?.headache, { today: false })
  assert.deepEqual(out?.jointsFelt, { yes: false })
})

test('the keys of the P1 indicators survive a settings backup', () => {
  const keys = ['unrefreshedWaking', 'swollenJoints', 'periodFlow', 'bowelBladder', 'headacheEpisode']
  assert.deepEqual(sanitizeSettings({ enabledFactors: keys })?.enabledFactors, keys)
})

test('the P2 indicators survive a backup as they were written, an empty list of signs included', () => {
  const full = { ...entry, legPain: 'toKnee', symptomTags: ['tingling', 'dizziness'], spasms: 3, feverInfection: true, newSymptom: false, sensorySensitivity: 8 }
  assert.deepEqual(sanitizeEntry(full), full)
  assert.deepEqual(sanitizeEntry({ ...entry, symptomTags: [] })?.symptomTags, [])
})

test('bad P2 values are dropped, an unknown sign or a repeat is left out', () => {
  const out = sanitizeEntry({ ...entry, legPain: 'hip', symptomTags: ['tingling', 'tingling', 'fever', 4], spasms: 11, feverInfection: 'yes', newSymptom: 1, sensorySensitivity: -1 })
  assert.equal(out?.legPain, undefined)
  assert.deepEqual(out?.symptomTags, ['tingling'])
  for (const k of ['spasms', 'feverInfection', 'newSymptom', 'sensorySensitivity'] as const) assert.equal(out?.[k], undefined, k)
  assert.equal(out?.painLevel, 6)
})

test('the keys of the P2 indicators survive a settings backup', () => {
  const keys = ['legPain', 'symptomTags', 'spasms', 'feverInfection', 'newSymptomMarker', 'sensorySensitivity']
  assert.deepEqual(sanitizeSettings({ enabledFactors: keys })?.enabledFactors, keys)
})

test('an unknown band or an out-of-range intensity is dropped, not an error', () => {
  const out = sanitizeEntry({ ...entry, morningStiffness: 'forever', morningStiffnessSeverity: 11 })
  assert.equal(out?.morningStiffness, undefined)
  assert.equal(out?.morningStiffnessSeverity, undefined)
  assert.equal(out?.painLevel, 6)
})

test('the morning stiffness key and its intensity setting survive a settings backup', () => {
  const out = sanitizeSettings({ enabledFactors: ['fatigue', 'morningStiffness', 'unknown'], morningStiffnessSeverityEnabled: true })
  assert.deepEqual(out?.enabledFactors, ['fatigue', 'morningStiffness'])
  assert.equal(out?.morningStiffnessSeverityEnabled, true)
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

test('what was answered to the leads is restored, and only what is well formed', () => {
  const good = { choice: 'kept', at: 5, gap: -1.8, days: 40 }
  const out = sanitizeSettings({
    leadChoices: {
      sleep: good,
      'action:marche': { choice: 'dismissed', at: 6, gap: -1.2, days: 20 },
      stress: { choice: 'maybe', at: 5, gap: 1, days: 3 },
      activity: { choice: 'kept', at: 'yesterday', gap: 1, days: 3 },
      other: { choice: 'kept', at: 5, gap: 99, days: 3 },
      broken: 'x',
    },
  })
  assert.deepEqual(out?.leadChoices, { sleep: good, 'action:marche': { choice: 'dismissed', at: 6, gap: -1.2, days: 20 } })
  assert.equal(sanitizeSettings({ leadChoices: 'x' })?.leadChoices, undefined)
})

test('answers to the leads that are all unusable leave the ones on this device alone, an empty set clears them', () => {
  assert.equal(sanitizeSettings({ leadChoices: { stress: { choice: 'maybe' }, broken: 'x' } })?.leadChoices, undefined)
  assert.deepEqual(sanitizeSettings({ leadChoices: {} })?.leadChoices, {})
})

test('the trial under way and the switches of the lead cards are restored, and only well formed', () => {
  const trial = { key: 'action:marche', action: 'Marche', start: '2026-10-05', end: '2026-10-11' }
  const out = sanitizeSettings({ leadTrial: trial, leadPromptEnabled: false, weeklySentenceEnabled: 'no', leadDotEnabled: false, trialsEnabled: true, leadsSeen: { prompted: ['sleep'] } })
  assert.deepEqual(out, { leadTrial: trial, leadPromptEnabled: false, leadDotEnabled: false, trialsEnabled: true })
  assert.equal(sanitizeSettings({ leadTrial: { ...trial, key: 'sleep' } })?.leadTrial, undefined)
  assert.equal(sanitizeSettings({ leadTrial: { ...trial, end: '2026-12-31' } })?.leadTrial, undefined)
  assert.equal(sanitizeSettings({ leadTrial: { ...trial, end: '2026-10-01' } })?.leadTrial, undefined)
  assert.equal(sanitizeSettings({ leadTrial: { ...trial, start: 'later' } })?.leadTrial, undefined)
})

test('the closed weeks are restored, each one well formed', () => {
  const week = { key: 'action:marche', action: 'Marche', start: '2026-10-05', end: '2026-10-11' }
  const out = sanitizeSettings({ leadTrialHistory: [week, { ...week, key: 'sleep' }, { ...week, end: 'x' }, 'no', { ...week, start: '2026-09-01', end: '2026-09-07' }] })
  assert.deepEqual(out?.leadTrialHistory, [week, { ...week, start: '2026-09-01', end: '2026-09-07' }])
  assert.equal(sanitizeSettings({ leadTrialHistory: 'x' })?.leadTrialHistory, undefined)
  // All unusable: the weeks on this device stay; an empty list clears them.
  assert.equal(sanitizeSettings({ leadTrialHistory: ['no', { ...week, end: 'x' }] })?.leadTrialHistory, undefined)
  assert.deepEqual(sanitizeSettings({ leadTrialHistory: [] })?.leadTrialHistory, [])
})

test('the hard-days switch is restored from a backup, which flare it was shown for is not', () => {
  const out = sanitizeSettings({ hardDaysCardEnabled: false, hardDaysSeen: { start: '2026-10-01', date: '2026-10-05', dismissed: true } })
  assert.deepEqual(out, { hardDaysCardEnabled: false })
  assert.deepEqual(sanitizeSettings({ hardDaysCardEnabled: 'no' }), {})
})

test('the lighter-form switch is restored from a backup, the day the full form was asked for is not', () => {
  assert.deepEqual(sanitizeSettings({ lightFormEnabled: false, fullFormDay: '2026-10-06' }), { lightFormEnabled: false })
  assert.deepEqual(sanitizeSettings({ lightFormEnabled: 'no' }), {})
  assert.deepEqual(sanitizeSettings({ kidsTabEnabled: false }), { kidsTabEnabled: false })
  assert.deepEqual(sanitizeSettings({ kidsTabEnabled: 'no' }), {})
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
