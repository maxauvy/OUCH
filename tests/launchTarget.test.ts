// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { launchTarget } from '../src/lib/launchTarget.ts'

test('only the two words of the shortcuts open a screen', () => {
  assert.equal(launchTarget('?go=souffler'), 'souffler')
  assert.equal(launchTarget('?go=douleur&x=1'), 'douleur')
  assert.equal(launchTarget('?go=settings'), null)
  assert.equal(launchTarget('?go='), null)
  assert.equal(launchTarget(''), null)
})

test('the card a doctor hands out is recognised, nothing else', async () => {
  const { fromDoctor } = await import('../src/lib/launchTarget.ts')
  assert.equal(fromDoctor('?de=medecin'), true)
  assert.equal(fromDoctor('?de=medecin&go=douleur'), true)
  assert.equal(fromDoctor('?de=autre'), false)
  assert.equal(fromDoctor(''), false)
})
