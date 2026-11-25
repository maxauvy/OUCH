// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanParcours, parcoursParts, toggleAsk } from '../src/lib/mdphParcours.ts'

const fills = (p: Parameters<typeof parcoursParts>[0]) => parcoursParts(p)?.map((l) => `${l.part}:${l.fill}`).join(' ')

test('nothing until the kind of request is answered', () => {
  assert.equal(parcoursParts(undefined), null)
  assert.equal(parcoursParts({ asks: ['aah'] }), null)
})

test('a renewal of the same rights: parts A and E only, as page 1 says', () => {
  assert.equal(fills({ kind: 'renewal', asks: ['aah'] }), 'A:yes B:no C:no D:no E:yes F:maybe')
})

test('a first request: the whole form; part D with the AAH or a request about work', () => {
  assert.equal(fills({ kind: 'first', asks: ['aah'] }), 'A:yes B:yes C:no D:yes E:yes F:maybe')
  assert.equal(parcoursParts({ kind: 'first', asks: ['rqth'] })!.find((l) => l.part === 'D')!.reason, 'askWork')
  assert.equal(fills({ kind: 'changed', asks: ['cmi'] }), 'A:yes B:yes C:no D:maybe E:yes F:maybe')
  assert.equal(fills({ kind: 'review', studying: true }), 'A:yes B:yes C:yes D:maybe E:yes F:maybe')
})

test('OUCH points at the boxes it helps with', () => {
  const lines = parcoursParts({ kind: 'first', asks: ['aah'] })!
  assert.deepEqual(lines.find((l) => l.part === 'B')!.helped, ['B2', 'B3'])
  assert.deepEqual(lines.find((l) => l.part === 'D')!.helped, ['D1'])
})

test('"not sure yet" stands alone', () => {
  assert.deepEqual(toggleAsk(['aah', 'rqth'], 'unsure'), ['unsure'])
  assert.deepEqual(toggleAsk(['unsure'], 'pch'), ['pch'])
  assert.deepEqual(toggleAsk(['pch'], 'aah'), ['aah', 'pch'])
  assert.deepEqual(toggleAsk(['aah', 'pch'], 'aah'), ['pch'])
})

test('a restored backup keeps only known answers', () => {
  assert.equal(cleanParcours('x'), undefined)
  assert.equal(cleanParcours({}), undefined)
  assert.deepEqual(cleanParcours({ kind: 'first', asks: ['aah', 'nope'], studying: 'yes', attached: ['identity', 2] }), { kind: 'first', asks: ['aah'], attached: ['identity'] })
})
