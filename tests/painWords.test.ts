// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_TYPED, MAX_WORDS, cleanPainWords, sameWords, summarizePainWords, usualWords } from '../src/lib/painWords.ts'
import { isOffered } from '../src/lib/indicatorCatalog.ts'
import { shiftISO } from '../src/lib/dates.ts'

const day = (n: number) => shiftISO('2026-11-01', n)

test('the words are tidied: palette ids kept, typed words trimmed, no repeat, three at most', () => {
  assert.deepEqual(cleanPainWords(['burning', '  comme un étau ', 'Burning', 'burning', 'dull', 'cramps']), ['burning', 'comme un étau', 'dull'])
  assert.equal(cleanPainWords(['x'.repeat(MAX_TYPED + 10)])![0]!.length, MAX_TYPED)
  assert.deepEqual(cleanPainWords([42, '', '  ']), [])
  assert.equal(cleanPainWords('burning'), undefined)
  assert.equal(cleanPainWords(['a', 'b', 'c', 'd'])!.length, MAX_WORDS)
})

test('the usual words are the ones chosen on most recent days, once there are three days with words', () => {
  const entries = [
    { date: day(0), painWords: ['pulling', 'dull'] },
    { date: day(1), painWords: ['pulling'] },
    { date: day(2), painWords: ['pulling', 'burning'] },
    { date: day(3), painWords: ['dull', 'pulling'] },
  ]
  assert.deepEqual(usualWords(entries, day(4)), ['pulling', 'dull'])
  // Today's own words do not count, and too few days say nothing.
  assert.deepEqual(usualWords(entries, day(2)), [])
  // Older than four weeks: forgotten.
  assert.deepEqual(usualWords(entries, day(40)), [])
})

test('same words whatever the order', () => {
  assert.ok(sameWords(['dull', 'pulling'], ['pulling', 'dull']))
  assert.ok(!sameWords(['dull'], ['pulling', 'dull']))
  assert.ok(!sameWords(undefined, ['dull']))
})

test('the summary counts days, and the flare days among them', () => {
  const entries = [
    { date: day(0), painWords: ['pulling'] },
    { date: day(1), painWords: ['burning', 'pulling'] },
    { date: day(2), painWords: ['burning'] },
    { date: day(3) },
    { date: day(4), painWords: [] },
  ]
  const s = summarizePainWords(entries, new Set([day(1), day(2)]))
  assert.equal(s.noted, 3)
  assert.deepEqual(s.words, [
    { word: 'burning', days: 2, flareDays: 2 },
    { word: 'pulling', days: 2, flareDays: 1 },
  ])
})

test('the words are offered with early access only, until the list has been reviewed', () => {
  assert.equal(isOffered('painWords', false), false)
  assert.equal(isOffered('painWords', true), true)
})
