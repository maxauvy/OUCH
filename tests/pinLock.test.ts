// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  changePin,
  createLock,
  FIRST_WAIT_MS,
  FREE_FAILURES,
  isLockDelay,
  isValidPin,
  LOCK_DELAYS_MIN,
  MAX_WAIT_MS,
  parseLock,
  shouldLock,
  tryPin,
  waitAfter,
  waitLeft,
  withDelay,
  withHiddenAt,
  withLanguage,
  type PinLock,
} from '../src/lib/pinLock.ts'

const lock = await createLock('1234')
const T0 = 1_000_000

/** `n` wrong codes in a row from `start`, one a second. */
async function fail(from: PinLock, n: number, start = T0): Promise<PinLock> {
  let l = from
  for (let i = 0; i < n; i++) {
    const out = await tryPin(l, '0000', start + i * 1000)
    assert.equal(out.ok, false)
    l = out.lock
  }
  return l
}

test('a code is four digits, nothing else', () => {
  for (const ok of ['0000', '1234', '0123']) assert.equal(isValidPin(ok), true, ok)
  for (const bad of ['', '123', '12345', '12a4', ' 1234', '１２３４', '12.4']) assert.equal(isValidPin(bad), false, bad)
})

test('the code is not kept, only a salted hash, and two locks for one code differ', async () => {
  const other = await createLock('1234')
  assert.notEqual(lock.hash, other.hash)
  assert.notEqual(lock.salt, other.salt)
  assert.ok(!JSON.stringify(lock).includes('1234'))
  assert.equal(lock.delayMinutes, 1)
  assert.equal(lock.failures, 0)
})

test('a lock cannot be made from something that is not a code', async () => {
  await assert.rejects(() => createLock('12'))
  await assert.rejects(() => createLock('abcd'))
})

test('the right code opens, the wrong one counts a failure', async () => {
  const good = await tryPin(lock, '1234', T0)
  assert.equal(good.ok, true)
  const bad = await tryPin(lock, '4321', T0)
  assert.equal(bad.ok, false)
  assert.equal(bad.lock.failures, 1)
  assert.equal(bad.ok === false && bad.waitMs, 0)
  const malformed = await tryPin(lock, '12', T0)
  assert.equal(malformed.ok, false)
  assert.equal(malformed.lock.failures, 1)
})

test('a good code starts the count again', async () => {
  const after = await fail(lock, FREE_FAILURES - 1)
  const out = await tryPin(after, '1234', T0 + 60_000)
  assert.ok(out.ok)
  assert.equal(out.lock.failures, 0)
  assert.equal(out.lock.lockedUntil, undefined)
})

test('the first failures cost nothing, then the wait starts at 30 seconds and doubles up to 15 minutes', () => {
  for (let n = 0; n < FREE_FAILURES; n++) assert.equal(waitAfter(n), 0, `${n} failures`)
  assert.equal(waitAfter(FREE_FAILURES), FIRST_WAIT_MS)
  assert.equal(waitAfter(FREE_FAILURES + 1), 2 * FIRST_WAIT_MS)
  assert.equal(waitAfter(FREE_FAILURES + 2), 4 * FIRST_WAIT_MS)
  assert.equal(waitAfter(FREE_FAILURES + 20), MAX_WAIT_MS)
  assert.equal(waitAfter(1000), MAX_WAIT_MS)
})

test('the fifth wrong code starts a wait', async () => {
  const before = await fail(lock, FREE_FAILURES - 1)
  assert.equal(waitLeft(before, T0 + 10_000), 0)
  const out = await tryPin(before, '0000', T0 + 10_000)
  assert.equal(out.ok, false)
  assert.equal(out.ok === false && out.waitMs, FIRST_WAIT_MS)
  assert.equal(waitLeft(out.lock, T0 + 10_000), FIRST_WAIT_MS)
  assert.equal(waitLeft(out.lock, T0 + 10_000 + FIRST_WAIT_MS), 0)
})

test('during a wait even the right code is refused, and nothing is counted: trying cannot shorten it', async () => {
  const waiting = await fail(lock, FREE_FAILURES)
  const now = T0 + 6000
  const right = await tryPin(waiting, '1234', now)
  assert.equal(right.ok, false)
  assert.equal(right.lock.failures, waiting.failures)
  assert.equal(right.lock.lockedUntil, waiting.lockedUntil)
  assert.ok(right.ok === false && right.waitMs > 0 && right.waitMs <= FIRST_WAIT_MS)
  const wrong = await tryPin(waiting, '0000', now)
  assert.equal(wrong.lock.failures, waiting.failures)
})

test('once the wait is over the right code opens', async () => {
  const waiting = await fail(lock, FREE_FAILURES)
  const out = await tryPin(waiting, '1234', waiting.lockedUntil! + 1)
  assert.ok(out.ok)
  assert.equal(out.lock.failures, 0)
})

test('a failure after a wait doubles the next one', async () => {
  const waiting = await fail(lock, FREE_FAILURES)
  const again = await tryPin(waiting, '0000', waiting.lockedUntil! + 1)
  assert.equal(again.ok === false && again.waitMs, 2 * FIRST_WAIT_MS)
})

test('a wrong code never erases anything: the lock only gets slower, up to the ceiling', async () => {
  let l = lock
  let now = T0
  for (let i = 0; i < 40; i++) {
    const out = await tryPin(l, '0000', now)
    assert.equal(out.ok, false)
    l = out.lock
    now = (l.lockedUntil ?? now) + 1 // each time, once the wait is over
  }
  assert.equal(l.hash, lock.hash)
  assert.equal(l.salt, lock.salt)
  assert.equal(l.failures, 40)
  assert.equal(waitLeft(l, l.lockedUntil! - MAX_WAIT_MS), MAX_WAIT_MS)
  assert.equal((await tryPin(l, '1234', now)).ok, true)
})

test('changing the code needs the current one', async () => {
  const changed = await changePin(lock, '1234', '5678', T0)
  assert.ok(changed)
  assert.equal((await tryPin(changed!, '5678', T0)).ok, true)
  assert.equal((await tryPin(changed!, '1234', T0)).ok, false)
  assert.equal(await changePin(lock, '0000', '5678', T0), null)
  assert.equal(await changePin(lock, '1234', '56', T0), null)
})

test('changing the code keeps the delay and the moment the app was last seen', async () => {
  const set = withHiddenAt(withDelay(lock, 5), 777)
  const changed = await changePin(set, '1234', '5678', T0)
  assert.equal(changed?.delayMinutes, 5)
  assert.equal(changed?.lastHiddenAt, 777)
})

test('a code cannot be changed during a wait', async () => {
  const waiting = await fail(lock, FREE_FAILURES)
  assert.equal(await changePin(waiting, '1234', '5678', T0 + 6000), null)
})

test('the delays on offer, and nothing else', () => {
  assert.deepEqual([...LOCK_DELAYS_MIN], [0, 1, 5, 15])
  for (const ok of [0, 1, 5, 15]) assert.equal(isLockDelay(ok), true)
  for (const bad of [2, -1, '1', null, undefined, 60]) assert.equal(isLockDelay(bad), false)
  assert.equal(withDelay(lock, 15).delayMinutes, 15)
})

test('the app locks when it was never seen leaving (a fresh start)', () => {
  assert.equal(shouldLock(lock, T0), true)
})

test('"right away" locks every time', () => {
  const l = withHiddenAt(withDelay(lock, 0), T0)
  assert.equal(shouldLock(l, T0), true)
  assert.equal(shouldLock(l, T0 + 1), true)
})

test('with a delay, the app opens freely until the delay has passed', () => {
  for (const minutes of [1, 5, 15] as const) {
    const l = withHiddenAt(withDelay(lock, minutes), T0)
    const delay = minutes * 60_000
    assert.equal(shouldLock(l, T0 + 5_000), false, `${minutes} min, 5 s away`)
    assert.equal(shouldLock(l, T0 + delay - 1), false, `${minutes} min, just under`)
    assert.equal(shouldLock(l, T0 + delay), true, `${minutes} min, exactly`)
    assert.equal(shouldLock(l, T0 + delay * 10), true, `${minutes} min, long after`)
  }
})

test('a clock that went back locks: it is the safe side', () => {
  assert.equal(shouldLock(withHiddenAt(lock, T0), T0 - 60_000), true)
})

test('what is read back from storage must be a lock, or it is no lock', () => {
  const stored = JSON.parse(JSON.stringify(withHiddenAt(lock, T0)))
  assert.deepEqual(parseLock(stored), withHiddenAt(lock, T0))
  for (const junk of [null, 'x', [], {}, { ...stored, salt: 'not base64!' }, { ...stored, hash: 3 }, { ...stored, iterations: 5_000_000_000 }, { ...stored, iterations: 1.5 }, { ...stored, delayMinutes: 7 }, { ...stored, failures: -1 }, { ...stored, failures: 'x' }, { ...stored, lockedUntil: 'x' }, { ...stored, lastHiddenAt: NaN }]) {
    assert.equal(parseLock(junk), null, JSON.stringify(junk))
  }
})

test('the language is kept with the lock, survives a change of code, and only fr or en is read back', async () => {
  const en = await createLock('1234', 1, 'en')
  assert.equal(en.language, 'en')
  assert.equal((await createLock('1234')).language, undefined)
  assert.equal(withLanguage(lock, 'fr').language, 'fr')
  assert.equal((await changePin(en, '1234', '5678', T0))?.language, 'en')
  const stored = JSON.parse(JSON.stringify(en))
  assert.equal(parseLock(stored)?.language, 'en')
  assert.equal(parseLock({ ...stored, language: 'de' })?.language, undefined)
  assert.equal(parseLock({ ...stored, language: 3 })?.language, undefined)
})
