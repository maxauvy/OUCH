// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appendTrace, formatTrace, TRACE_MAX, type TraceEntry } from '../src/lib/lockTrace.ts'

const at = (e: string, t: number, v = 'visible', f = true): TraceEntry => ({ e, t, v, f })

test('the trace keeps the newest entries only', () => {
  let list: TraceEntry[] = []
  for (let i = 0; i < TRACE_MAX + 10; i++) list = appendTrace(list, at(`e${i}`, i))
  assert.equal(list.length, TRACE_MAX)
  assert.equal(list[0]!.e, 'e10')
  assert.equal(list.at(-1)!.e, `e${TRACE_MAX + 9}`)
})

test('adding an entry never changes the list it was given', () => {
  const list = [at('a', 1)]
  appendTrace(list, at('b', 2))
  assert.equal(list.length, 1)
})

test('each line shows the time, the event, the page state and the gap since the line above', () => {
  const t0 = Date.UTC(2026, 9, 14, 8, 30, 15, 120)
  const lines = formatTrace([at('blur', t0), at('pagehide', t0 + 35, 'visible'), at('visibilitychange', t0 + 52, 'hidden', false)]).split('\n')
  assert.equal(lines.length, 3)
  assert.match(lines[0]!, /^08:30:15\.120 {2}blur +vis$/)
  assert.match(lines[1]!, /^08:30:15\.155 {2}pagehide +vis {2}\+35 ms$/)
  assert.match(lines[2]!, /^08:30:15\.172 {2}visibilitychange +hid nofocus {2}\+17 ms$/)
  assert.equal(formatTrace([]), '')
})
