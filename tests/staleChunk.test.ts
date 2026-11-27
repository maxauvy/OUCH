// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shouldReloadForChunk } from '../src/lib/staleChunk.ts'

function fakeStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data }
}

test('a file gone after a release: one reload, noted', () => {
  const store = fakeStore()
  assert.equal(shouldReloadForChunk(1_000_000, store), true)
  assert.equal(store.data.get('ouch:staleChunkReload'), '1000000')
})

test('a second failure right after the reload is a real problem: no loop', () => {
  const store = fakeStore()
  assert.equal(shouldReloadForChunk(1_000_000, store), true)
  assert.equal(shouldReloadForChunk(1_010_000, store), false)
})

test('a failure long after (another release, the same tab) reloads again', () => {
  const store = fakeStore({ 'ouch:staleChunkReload': '1000000' })
  assert.equal(shouldReloadForChunk(1_000_000 + 60_000, store), true)
})

test('without storage, or with storage that refuses, no reload (nothing would stop a loop)', () => {
  assert.equal(shouldReloadForChunk(1, undefined), false)
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.equal(shouldReloadForChunk(1, broken), false)
})

test('a damaged note is ignored', () => {
  assert.equal(shouldReloadForChunk(5_000, fakeStore({ 'ouch:staleChunkReload': 'abc' })), true)
})
