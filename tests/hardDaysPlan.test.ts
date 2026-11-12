// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_PLAN, cleanPlan, hasPlan, planFromBackup, planGlimpse } from '../src/lib/hardDaysPlan.ts'

test('what is typed is tidied, empty fields are dropped, and an empty plan leaves nothing', () => {
  assert.deepEqual(cleanPlan({ allow: '  Ne rien faire  ', helps: '', who: '   ', remember: 'Mon traitement' }), { allow: 'Ne rien faire', remember: 'Mon traitement' })
  assert.equal(cleanPlan({ allow: ' ', helps: '' }), undefined)
  assert.equal(cleanPlan(null), undefined)
})

test('a field is cut at its limit and line breaks are kept as plain ones', () => {
  const plan = cleanPlan({ helps: 'a'.repeat(MAX_PLAN + 50), who: 'Léa\r\n06 12' })
  assert.equal(plan?.helps?.length, MAX_PLAN)
  assert.equal(plan?.who, 'Léa\n06 12')
})

test('a plan from a backup keeps only the strings of the four fields', () => {
  assert.deepEqual(planFromBackup({ allow: 'Noter', helps: 42, extra: 'x', who: ['a'] }), { allow: 'Noter' })
  assert.equal(planFromBackup('plan'), undefined)
  assert.equal(planFromBackup([{ allow: 'x' }]), undefined)
  assert.equal(planFromBackup({}), undefined)
})

test('a glimpse is the first line of the first filled field, shortened', () => {
  assert.equal(planGlimpse(undefined), '')
  assert.equal(planGlimpse({ helps: 'Bouillotte\nBain chaud' }), 'Bouillotte')
  assert.equal(planGlimpse({ allow: 'x'.repeat(100) }, 20), `${'x'.repeat(19)}…`)
  assert.ok(hasPlan({ who: 'Léa' }) && !hasPlan({}) && !hasPlan(undefined))
})
