// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSheets, rowsBlock, type Block } from '../src/components/report/pagination.ts'

const pages: Block[][] = [['a', rowsBlock(4, (from, to) => `rows ${from}-${to}`), 'b']]

test('a page is one sheet until something is cut', () => {
  const sheets = buildSheets(pages, [])
  assert.equal(sheets.length, 1)
  assert.deepEqual(sheets[0].parts.map((p) => p.splittable), [false, true, false])
})

test('a cut between two rows splits a list over two sheets', () => {
  const sheets = buildSheets(pages, [{ page: 0, block: 1, row: 2 }])
  assert.equal(sheets.length, 2)
  assert.deepEqual(sheets[0].parts.map((p) => p.node), ['a', 'rows 0-2'])
  assert.deepEqual(sheets[1].parts.map((p) => p.node), ['rows 2-4', 'b'])
})

test('a cut before a block that is not a list moves it whole to the next sheet', () => {
  const sheets = buildSheets(pages, [{ page: 0, block: 2, row: 0 }])
  assert.equal(sheets.length, 2)
  assert.deepEqual(sheets[1].parts.map((p) => p.node), ['b'])
})

test('a row cut inside a block that cannot be split does nothing, which is why it must not be asked for', () => {
  assert.equal(buildSheets(pages, [{ page: 0, block: 2, row: 1 }]).length, 1)
})
