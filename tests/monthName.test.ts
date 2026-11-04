// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { frenchOfMonth } from '../src/lib/monthName.ts'

test('"de" before a consonant, "d’" before a vowel, for the twelve months', () => {
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  assert.deepEqual(
    months.map(frenchOfMonth),
    ['de janvier', 'de février', 'de mars', 'd’avril', 'de mai', 'de juin', 'de juillet', 'd’août', 'de septembre', 'd’octobre', 'de novembre', 'de décembre']
  )
})

test('a capitalised name is handled the same', () => {
  assert.equal(frenchOfMonth('Octobre'), 'd’Octobre')
})
