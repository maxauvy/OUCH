// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { forgetUpdated, justUpdated, markUpdated } from '../src/lib/justUpdated.ts'

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data }
}

test('the tap on "reload" leaves a note; the page that comes back reads it, as often as React asks, until it is thrown away', () => {
  const store = fakeStore()
  assert.equal(justUpdated(store), false)
  markUpdated(store)
  assert.equal(justUpdated(store), true)
  assert.equal(justUpdated(store), true)
  forgetUpdated(store)
  assert.equal(justUpdated(store), false)
  assert.equal(store.data.size, 0)
})

test('without a note, or with storage that refuses, nothing is said and nothing breaks', () => {
  assert.equal(justUpdated(fakeStore({ 'ouch:justUpdated': 'no' })), false)
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
  assert.doesNotThrow(() => markUpdated(broken))
  assert.equal(justUpdated(broken), false)
  assert.doesNotThrow(() => forgetUpdated(broken))
  // No storage at all (plain Node, a locked-down browser).
  assert.equal(justUpdated(undefined), false)
  assert.doesNotThrow(() => markUpdated(undefined))
})
