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
