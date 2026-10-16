// Run with `npm test`. The lock module keeps its state at module level and
// reads storage when it loads, so each test gives it fresh storages and loads a
// fresh copy of it, as a launch of the app would.
import assert from 'node:assert/strict'
import { test } from 'node:test'

type AppLock = typeof import('../src/lib/appLock.ts')

function memoryStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
  }
}

let launches = 0
/** A launch of the app: `local` outlives it, `session` is empty unless it is a reload inside the same session. */
async function launch(local = memoryStorage(), session = memoryStorage()) {
  Object.assign(globalThis, { localStorage: local, sessionStorage: session })
  const lock = (await import(`../src/lib/appLock.ts?launch=${launches++}`)) as AppLock
  return { lock, local, session }
}

const PIN = '2468'
const KEY = 'ouch:pin-lock'
const storedLocked = (local: ReturnType<typeof memoryStorage>) => JSON.parse(local.getItem(KEY) ?? '{}').locked

test('without a code the app is open', async () => {
  const { lock } = await launch()
  assert.deepEqual({ ...lock.getLockSnapshot() }, { enabled: false, locked: false, delayMinutes: 1, language: undefined })
})

test('setting a code leaves the app open, and a launch from scratch asks for it', async () => {
  const first = await launch()
  assert.equal(await first.lock.enableLock(PIN), true)
  assert.equal(first.lock.getLockSnapshot().enabled, true)
  assert.equal(first.lock.getLockSnapshot().locked, false)
  // closed and opened again: the session storage is gone, the code is still there
  const second = await launch(first.local)
  assert.equal(second.lock.getLockSnapshot().locked, true)
  assert.equal(storedLocked(first.local), true, 'a lock that is up is kept up through a reload')
})

test('the right code opens the app, a wrong one does not and is counted', async () => {
  const { lock, local } = await launch()
  await lock.enableLock(PIN)
  lock.lockNow()
  assert.equal(lock.getLockSnapshot().locked, true)
  assert.deepEqual(await lock.unlock('0000'), { ok: false, waitMs: 0 })
  assert.equal(lock.getLockSnapshot().locked, true)
  assert.equal(JSON.parse(local.getItem(KEY)!).failures, 1)
  assert.deepEqual(await lock.unlock(PIN), { ok: true })
  assert.equal(lock.getLockSnapshot().locked, false)
  assert.equal(JSON.parse(local.getItem(KEY)!).failures, 0)
})

test('a locked app stays locked through a reload in the same session, whatever the delay', async () => {
  const { lock, local, session } = await launch()
  await lock.enableLock(PIN, 15)
  lock.lockNow()
  const reloaded = await launch(local, session)
  assert.equal(reloaded.lock.getLockSnapshot().locked, true)
})

test('an unlocked app reloaded inside its session follows the delay', async () => {
  const { lock, local, session } = await launch()
  await lock.enableLock(PIN, 15)
  assert.equal(storedLocked(local), undefined)
  // no hidden time was kept: nothing says the app went away, so the safe side
  const reloaded = await launch(local, session)
  assert.equal(reloaded.lock.getLockSnapshot().locked, true)
})

test('the pass left before "Recharger" is used once, and only by an unlocked app', async () => {
  const { lock, local } = await launch()
  await lock.enableLock(PIN)
  lock.grantReloadPass()
  assert.notEqual(local.getItem('ouch:lock-reload-pass'), null)
  const reloaded = await launch(local)
  assert.equal(reloaded.lock.getLockSnapshot().locked, false)
  assert.equal(local.getItem('ouch:lock-reload-pass'), null, 'the pass is spent')
  // the next cold start asks again
  const again = await launch(local)
  assert.equal(again.lock.getLockSnapshot().locked, true)
})

test('a locked app does not hand out a pass', async () => {
  const { lock, local } = await launch()
  await lock.enableLock(PIN)
  lock.lockNow()
  lock.grantReloadPass()
  assert.equal(local.getItem('ouch:lock-reload-pass'), null)
})

test('taking the code away removes the lock and what was kept', async () => {
  const { lock, local } = await launch()
  await lock.enableLock(PIN)
  lock.disableLock()
  assert.equal(lock.getLockSnapshot().enabled, false)
  assert.equal(local.getItem(KEY), null)
  assert.equal(lock.lockWaitMs(), 0)
})

test('too many wrong codes make the app wait, and the right code is refused meanwhile', async () => {
  const { lock } = await launch()
  await lock.enableLock(PIN)
  lock.lockNow()
  for (let i = 0; i < 4; i++) assert.deepEqual(await lock.unlock('0000'), { ok: false, waitMs: 0 })
  const fifth = await lock.unlock('0000')
  assert.equal(fifth.ok, false)
  assert.ok(!fifth.ok && fifth.waitMs > 0)
  assert.ok(lock.lockWaitMs() > 0)
  const right = await lock.unlock(PIN)
  assert.equal(right.ok, false)
  assert.equal(lock.getLockSnapshot().locked, true)
})
