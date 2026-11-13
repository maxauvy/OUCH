import assert from 'node:assert/strict'
import { test } from 'node:test'
import { currentGestures, currentLabel, currentLabels } from '../src/lib/renamedSuggestions.ts'
import { sanitizeEntry, sanitizeSettings } from '../src/lib/backupSanitize.ts'

test('the old wordings take the current one, in their own language; other texts stay as typed', () => {
  assert.equal(currentLabel('Bain chaud'), 'Bain / douche chaude')
  assert.equal(currentLabel(' bain  chaud '), 'Bain / douche chaude')
  assert.equal(currentLabel('Warm bath'), 'Warm bath / shower')
  assert.equal(currentLabel('Bain chaud avec du sel'), 'Bain chaud avec du sel')
  assert.equal(currentLabel('Marche courte'), 'Marche courte')
})

test('a day that had both wordings keeps one, in place', () => {
  assert.deepEqual(currentLabels(['Repos / sieste', 'Bain chaud', 'bain / douche chaude']), ['Repos / sieste', 'Bain / douche chaude'])
  assert.deepEqual(currentLabels(['Bain chaud']), ['Bain / douche chaude'])
})

test('kept gestures follow, and the first of two that meet keeps its time', () => {
  assert.deepEqual(currentGestures([{ name: 'Bain chaud', minutes: 15 }, { name: 'Marche', minutes: 10 }, { name: 'Bain / douche chaude', minutes: 20 }]), [
    { name: 'Bain / douche chaude', minutes: 15 },
    { name: 'Marche', minutes: 10 },
  ])
})

test('an older backup comes in with the current wording', () => {
  const e = sanitizeEntry({ date: '2026-05-04', painLevel: 6, createdAt: 1, updatedAt: 2, positiveActions: ['Bain chaud', 'Marche'] })
  assert.deepEqual(e?.positiveActions, ['Bain / douche chaude', 'Marche'])
  const s = sanitizeSettings({ reliefGestures: [{ name: 'Bain chaud', minutes: 15 }] })
  assert.deepEqual(s?.reliefGestures, [{ name: 'Bain / douche chaude', minutes: 15 }])
})
