// Run with `npm test`.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { canProtectStorage, isStorageProtected, requestStorageProtection } from '../src/lib/storage.ts'

function stubStorage(storage: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value: { storage }, configurable: true })
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'navigator')
})

test('a browser without the Storage API reports nothing and grants nothing', async () => {
  stubStorage(undefined)
  assert.equal(canProtectStorage(), false)
  assert.equal(await isStorageProtected(), null)
  assert.equal(await requestStorageProtection(), null)
})

test('already protected storage is not asked again', async () => {
  let asked = 0
  stubStorage({ persisted: async () => true, persist: async () => (asked++, true) })
  assert.equal(await requestStorageProtection(), true)
  assert.equal(asked, 0)
})

test('unprotected storage is asked for, and the answer is passed on', async () => {
  for (const granted of [true, false]) {
    stubStorage({ persisted: async () => false, persist: async () => granted })
    assert.equal(await requestStorageProtection(), granted)
  }
})

test('a browser that throws is treated as unable to say', async () => {
  const fail = async () => {
    throw new Error('blocked')
  }
  stubStorage({ persisted: fail, persist: fail })
  assert.equal(await isStorageProtected(), null)
  assert.equal(await requestStorageProtection(), null)
})
