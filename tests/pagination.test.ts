// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSheets, keepWithNext, rowsBlock, rowsToc, type Block } from '../src/components/report/pagination.ts'

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

test('a planned page that follows a page which overflowed continues on the same sheet, so a short end of part leaves no blank sheet', () => {
  const pages: Block[][] = [['a', 'b', 'c'], ['d'], ['e']]
  const sheets = buildSheets(pages, [{ page: 0, block: 2, row: 0 }])
  assert.deepEqual(sheets.map((s) => s.parts.map((p) => p.page)), [[0, 0], [0, 1], [2]])
})

test('a list or table block carries the name the contents line points to', () => {
  assert.equal(rowsToc(rowsBlock(3, () => null, 'timeline')), 'timeline')
  assert.equal(rowsToc(rowsBlock(3, () => null)), undefined)
  assert.equal(rowsToc('plain'), undefined)
})

test('a title band kept with what follows moves with it, rather than staying alone at the bottom of a sheet', () => {
  // Sheet 2: the end of part 1 (page 0, block 2), then part 2's band (page 1, block 0) and its first block (page 1, block 1), which overflows.
  const pages: Block[][] = [['a', 'b', 'c'], ['band', 'd']]
  const parts = buildSheets(pages, [{ page: 0, block: 2, row: 0 }])[1].parts
  const isBand = (j: number) => parts[j].node === 'band'
  assert.deepEqual(keepWithNext({ page: 1, block: 1, row: 0 }, parts, 2, isBand), { page: 1, block: 0, row: 0 })
  // A cut between rows keeps the band with the rows above it; a band first on its sheet stays.
  assert.deepEqual(keepWithNext({ page: 1, block: 1, row: 3 }, [...parts.slice(0, 2), { ...parts[2], from: 0, splittable: true }], 2, isBand), { page: 1, block: 1, row: 3 })
  assert.deepEqual(keepWithNext({ page: 1, block: 1, row: 0 }, parts.slice(1), 1, (j) => j === 0), { page: 1, block: 1, row: 0 })
})
