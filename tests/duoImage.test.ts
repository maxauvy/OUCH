import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signature } from '../src/duo/signature.ts'

const file = (iv: number[]) => new Uint8Array([79, 87, 73, 49, ...iv, 1, 2, 3]).buffer

test('the same sent file gives the same signature', () => {
  const iv = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  assert.equal(signature(file(iv)), signature(file(iv)))
  assert.equal(signature(file(iv)), '0102030405060708090a0b0c')
})

test('a new sending (a new IV) gives a new signature', () => {
  assert.notEqual(signature(file([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), signature(file([9, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])))
})

test('a file too short to hold an IV does not throw', () => {
  assert.equal(signature(new Uint8Array([79, 87]).buffer), '')
})
