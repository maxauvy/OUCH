// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SUPPORT_MIN_DAYS, SUPPORT_URL, showSupport } from '../src/lib/support.ts'

test('the support address is either empty (card hidden) or a secure link', () => {
  const url: string = SUPPORT_URL
  assert.ok(url === '' || /^https:\/\/[^\s]+$/.test(url))
})

test('the card waits for an address and for enough days of diary', () => {
  const url = 'https://ko-fi.com/someone'
  assert.equal(showSupport(url, undefined), false)
  assert.equal(showSupport(url, SUPPORT_MIN_DAYS - 1), false)
  assert.equal(showSupport(url, SUPPORT_MIN_DAYS), true)
  assert.equal(showSupport('', 200), false)
})
