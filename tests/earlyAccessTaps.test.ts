// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerTap, TAP_GAP_MS, TAPS_NEEDED, type TapRun } from '../src/lib/earlyAccessTaps.ts'

function tapAll(times: number[]): { run: TapRun | null; dones: number } {
  let run: TapRun | null = null
  let dones = 0
  for (const t of times) {
    const out = registerTap(run, t)
    run = out.run
    if (out.done) dones++
  }
  return { run, dones }
}

test('five quick taps in a row complete the gesture, on the fifth', () => {
  const quick = Array.from({ length: TAPS_NEEDED }, (_, i) => i * 400)
  assert.equal(tapAll(quick.slice(0, -1)).dones, 0)
  assert.equal(tapAll(quick).dones, 1)
})

test('a pause between taps starts the count again', () => {
  const taps = [0, 300, 600, 900 + TAP_GAP_MS + 1, 900 + TAP_GAP_MS + 300]
  assert.equal(tapAll(taps).dones, 0)
})

test('the gesture can be done again right after: ten quick taps are two gestures', () => {
  assert.equal(tapAll(Array.from({ length: 2 * TAPS_NEEDED }, (_, i) => i * 300)).dones, 2)
})

test('a tap exactly at the gap still counts', () => {
  assert.equal(tapAll(Array.from({ length: TAPS_NEEDED }, (_, i) => i * TAP_GAP_MS)).dones, 1)
})
