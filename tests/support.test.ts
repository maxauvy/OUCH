// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SUPPORT_URL } from '../src/lib/support.ts'

test('the support address is either empty (card hidden) or a secure link', () => {
  const url: string = SUPPORT_URL
  assert.ok(url === '' || /^https:\/\/[^\s]+$/.test(url))
})
