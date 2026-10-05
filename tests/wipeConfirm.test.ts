// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { confirmationMatches } from '../src/lib/wipeConfirm.ts'

test('the word matches whatever its case, spacing or accents', () => {
  assert.ok(confirmationMatches('SUPPRIMER', 'SUPPRIMER'))
  assert.ok(confirmationMatches('supprimer', 'SUPPRIMER'))
  assert.ok(confirmationMatches('  Supprimer ', 'SUPPRIMER'))
  assert.ok(confirmationMatches('Supprimér', 'SUPPRIMER'))
  assert.ok(confirmationMatches('delete', 'DELETE'))
})

test('anything else does not, nor does an empty word', () => {
  assert.equal(confirmationMatches('', 'SUPPRIMER'), false)
  assert.equal(confirmationMatches('SUPPRIME', 'SUPPRIMER'), false)
  assert.equal(confirmationMatches('SUPPRIMER tout', 'SUPPRIMER'), false)
  assert.equal(confirmationMatches('DELETE', 'SUPPRIMER'), false)
  assert.equal(confirmationMatches('', ''), false)
  assert.equal(confirmationMatches('  ', ' '), false)
})
