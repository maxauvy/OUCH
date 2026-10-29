// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { upgradeLegacySettings } from '../src/db/settingsUpgrade.ts'
import type { LegacySettings } from '../src/db/types.ts'

test('someone who had already set the app up keeps the Kids tab', () => {
  const s: LegacySettings = { onboardingDone: true }
  upgradeLegacySettings(s)
  assert.equal(s.kidsTabEnabled, true)
})

test('an answer already given is never overridden', () => {
  const off: LegacySettings = { onboardingDone: true, kidsTabEnabled: false }
  upgradeLegacySettings(off)
  assert.equal(off.kidsTabEnabled, false)
  const on: LegacySettings = { onboardingDone: true, kidsTabEnabled: true }
  upgradeLegacySettings(on)
  assert.equal(on.kidsTabEnabled, true)
})

test('a setup not finished yet has no Kids tab until it is asked for', () => {
  const s: LegacySettings = { onboardingDone: false }
  upgradeLegacySettings(s)
  assert.equal(s.kidsTabEnabled, undefined)
})

test('the older upgrades still apply', () => {
  const s: LegacySettings = { onboardingDone: true, childIllness: 'migraine', design: 'classic', enabledFactors: ['sleep', 'cycle'] }
  upgradeLegacySettings(s)
  assert.deepEqual(s.illnesses, ['migraine'])
  assert.equal('childIllness' in s, false)
  assert.equal('design' in s, false)
  assert.equal(s.cycleTrackingEnabled, true)
  assert.deepEqual(s.enabledFactors, ['sleep'])
})

test('the four suggestion switches become one, off if any of them was off', () => {
  const off: LegacySettings = { leadPromptEnabled: true, weeklySentenceEnabled: true, leadDotEnabled: false, trialsEnabled: true }
  upgradeLegacySettings(off)
  assert.equal(off.suggestionsEnabled, false)
  for (const k of ['leadPromptEnabled', 'weeklySentenceEnabled', 'leadDotEnabled', 'trialsEnabled']) assert.equal(k in off, false)
  const on: LegacySettings = { leadPromptEnabled: true, weeklySentenceEnabled: true, leadDotEnabled: true, trialsEnabled: true }
  upgradeLegacySettings(on)
  assert.equal(on.suggestionsEnabled, undefined)
})

test('a suggestions choice already made is never overridden by old switches', () => {
  const s: LegacySettings = { suggestionsEnabled: true, trialsEnabled: false }
  upgradeLegacySettings(s)
  assert.equal(s.suggestionsEnabled, true)
})

test('the note on hard days keeps its own switch', () => {
  const s: LegacySettings = { hardDaysCardEnabled: false, leadPromptEnabled: true }
  upgradeLegacySettings(s)
  assert.equal(s.hardDaysCardEnabled, false)
  assert.equal(s.suggestionsEnabled, undefined)
})
