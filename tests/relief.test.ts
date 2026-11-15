// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DURATIONS, ENDINGS, SESSION_SECONDS, VIBRATION, breathAt, pickEnding } from '../src/lib/relief.ts'

test('the breath is 4 seconds in, then 6 out, and counts the seconds left', () => {
  assert.deepEqual(breathAt(0), { phase: 'in', left: 4, breaths: 0, done: false })
  assert.deepEqual(breathAt(3500), { phase: 'in', left: 1, breaths: 0, done: false })
  assert.deepEqual(breathAt(4000), { phase: 'out', left: 6, breaths: 0, done: false })
  assert.deepEqual(breathAt(9999), { phase: 'out', left: 1, breaths: 0, done: false })
  assert.deepEqual(breathAt(10000), { phase: 'in', left: 4, breaths: 1, done: false })
})

test('it ends by itself after three minutes, and a negative time is the start', () => {
  assert.equal(SESSION_SECONDS, 180)
  assert.equal(breathAt(179_000).done, false)
  assert.deepEqual(breathAt(180_000), { phase: 'out', left: 0, breaths: 18, done: true })
  assert.equal(breathAt(-5).phase, 'in')
})

test('the session can be one, three or five minutes', () => {
  assert.deepEqual([...DURATIONS], [60, 180, 300])
  assert.equal(breathAt(59_000, 60).done, false)
  assert.equal(breathAt(60_000, 60).done, true)
  assert.equal(breathAt(60_000).done, false)
  assert.deepEqual(VIBRATION, { in: [40], out: [40, 120, 40] })
})

test('the action offered after the exercise is one the entry form suggests, so it reads like the others', async () => {
  const fr = (await import('../src/i18n/locales/fr.ts')).default
  const en = (await import('../src/i18n/locales/en.ts')).default
  assert.ok(fr.entryForm.positiveActionsSuggestions.includes(fr.relief.action))
  assert.ok(en.entryForm.positiveActionsSuggestions.includes(en.relief.action))
})

test('the closing screen of an exercise is one of the three, at random, whatever the draw gives', () => {
  assert.equal(ENDINGS, 3)
  assert.deepEqual([0, 0.2, 0.34, 0.5, 0.67, 0.99].map((r) => pickEnding(() => r)), [0, 0, 1, 1, 2, 2])
  // A draw outside [0, 1) still gives a screen that exists.
  assert.equal(pickEnding(() => 1), ENDINGS - 1)
  assert.equal(pickEnding(() => -0.5), 0)
  const seen = new Set(Array.from({ length: 200 }, () => pickEnding()))
  assert.deepEqual([...seen].sort(), [0, 1, 2])
})

test('each closing screen has its word and its lines, in both languages, and the exercise lines carry their blanks', async () => {
  const { default: fr } = await import('../src/i18n/locales/fr.ts')
  const { default: en } = await import('../src/i18n/locales/en.ts')
  for (const t of [fr.relief.end, en.relief.end]) {
    assert.equal(t.variants.length, ENDINGS)
    for (const v of t.variants) assert.ok(v.title.length > 0)
    assert.match(t.breathInfo, /\{\{n\}\}/)
    assert.match(t.stepsInfo, /\{\{title\}\}.*\{\{n\}\}/)
    assert.match(t.gestureInfo, /\{\{name\}\}.*\{\{n\}\}/)
  }
})

test('the gentle exercise adds the stretching suggestion, found by its place in the list in each language', async () => {
  const { default: fr } = await import('../src/i18n/locales/fr.ts')
  const { default: en } = await import('../src/i18n/locales/en.ts')
  assert.equal(fr.entryForm.positiveActionsSuggestions[3], 'Étirements doux')
  assert.equal(en.entryForm.positiveActionsSuggestions[3], 'Gentle stretching')
})
