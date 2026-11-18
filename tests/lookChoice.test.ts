import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLook } from '../src/lib/lookChoice.ts'

test('nothing stored, or anything unknown, is the default weather look', () => {
  assert.equal(parseLook(null), 'meteo')
  assert.equal(parseLook(''), 'meteo')
  assert.equal(parseLook('luminous'), 'meteo')
})

test('the lighter look is kept, and those who had gone back to the classic look get it', () => {
  assert.equal(parseLook('leger'), 'leger')
  assert.equal(parseLook('classic'), 'leger')
})
