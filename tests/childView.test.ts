// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ILLNESSES } from '../src/db/types.ts'
import { CHILD_TONES, formatIllnessList, getIllnessExplanation, getIllnessLabel, getIllnessTitle } from '../src/lib/childView.ts'

test('rheumatoid arthritis and spondyloarthritis carry their current names', () => {
  assert.equal(getIllnessLabel('fr', 'arthrite'), 'Polyarthrite rhumatoïde')
  assert.equal(getIllnessTitle('fr', 'arthrite'), 'La polyarthrite rhumatoïde')
  assert.equal(getIllnessLabel('en', 'arthrite'), 'Rheumatoid arthritis')
  assert.equal(getIllnessLabel('fr', 'spondylarthrite'), 'Spondyloarthrite')
  assert.equal(getIllnessLabel('en', 'spondylarthrite'), 'Spondyloarthritis')
})

test('the stored identifiers are unchanged, so existing profiles and backups still match', () => {
  assert.ok(ILLNESSES.includes('arthrite'))
  assert.ok(ILLNESSES.includes('spondylarthrite'))
})

test('a list of illnesses reads as one sentence', () => {
  assert.equal(formatIllnessList('fr', ['fibromyalgie', 'arthrite', 'myofasciale']), 'Fibromyalgie, polyarthrite rhumatoïde et douleur myofasciale')
  assert.equal(formatIllnessList('en', ['arthrite', 'myofasciale']), 'Rheumatoid arthritis and myofascial pain')
})

test('every illness explains itself in each tone, language and parent', () => {
  for (const language of ['fr', 'en'] as const)
    for (const illness of ILLNESSES)
      for (const tone of CHILD_TONES)
        for (const gender of ['maman', 'papa'] as const)
          assert.ok(getIllnessExplanation(language, illness, tone, gender).length > 40, `${language} ${illness} ${tone}`)
})

test('the French copy no longer uses the old spelling of spondyloarthrite', () => {
  for (const tone of CHILD_TONES) assert.ok(!/spondylarthrite/i.test(getIllnessExplanation('fr', 'spondylarthrite', tone, 'maman')))
})
