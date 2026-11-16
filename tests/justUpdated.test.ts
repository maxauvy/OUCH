// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { forgetUpdated, justUpdated, lastSeenVersion, markUpdated, rememberVersion, versionChanged } from '../src/lib/justUpdated.ts'

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

test('the first time there is nothing to compare with: no change, whatever the version', () => {
  const store = fakeStore()
  assert.equal(lastSeenVersion(store), null)
  assert.equal(versionChanged('0.12.3', store), false)
  rememberVersion('0.12.3', store)
  assert.equal(lastSeenVersion(store), '0.12.3')
  assert.equal(versionChanged('0.12.3', store), false)
})

test('a version that is not the one seen last is a change, said once: after it is remembered, it is the same again', () => {
  const store = fakeStore({ 'ouch:lastSeenVersion': '0.12.2' })
  assert.equal(versionChanged('0.12.3', store), true)
  // Read twice, as React may: still a change until the page remembers it.
  assert.equal(versionChanged('0.12.3', store), true)
  rememberVersion('0.12.3', store)
  assert.equal(versionChanged('0.12.3', store), false)
  // Several releases at once: still one change.
  rememberVersion('0.12.3', store)
  assert.equal(versionChanged('0.14.0', store), true)
})

test('it keeps one short string and nothing else; a long or empty one counts as nothing remembered', () => {
  const store = fakeStore()
  rememberVersion('0.12.3', store)
  assert.deepEqual([...store.data.keys()], ['ouch:lastSeenVersion'])
  assert.equal(lastSeenVersion(fakeStore({ 'ouch:lastSeenVersion': '' })), null)
  assert.equal(lastSeenVersion(fakeStore({ 'ouch:lastSeenVersion': 'x'.repeat(200) })), null)
  assert.equal(versionChanged('0.12.3', fakeStore({ 'ouch:lastSeenVersion': 'x'.repeat(200) })), false)
})

test('with storage that refuses or is missing, the version is never said to have changed', () => {
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
  assert.equal(lastSeenVersion(broken), null)
  assert.equal(versionChanged('0.12.3', broken), false)
  assert.doesNotThrow(() => rememberVersion('0.12.3', broken))
  assert.equal(versionChanged('0.12.3', undefined), false)
  assert.doesNotThrow(() => rememberVersion('0.12.3', undefined))
})
