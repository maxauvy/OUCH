import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildId } from '../src/lib/buildId.ts'

test('the same commit differs between the push to main and the release tag', () => {
  assert.notEqual(buildId('abc1234', false), buildId('abc1234', true))
})

test('two builds of the same commit and tag state are the same build', () => {
  assert.equal(buildId('abc1234', true), buildId('abc1234', true))
  assert.equal(buildId('abc1234', false), 'abc1234')
})
