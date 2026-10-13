// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyAsFile, copyName, copyNameDate, COPIES_KEPT, isBackupDue, listCopies, MIN_GAP_MS, runBackup } from '../src/lib/autoBackup.ts'
import { createBackupKey, decryptJSON, encryptJSONWithKey, sha256Hex, type BackupKey } from '../src/lib/crypto.ts'
import { memoryProvider } from '../src/lib/cloud/memoryProvider.ts'

const key = await createBackupKey('mot de passe')
const bundle = { version: 2, exportedAt: '2026-10-13T08:00:00.000Z', entries: [{ date: '2026-10-12' }] }

async function makeCopy(k: BackupKey) {
  const text = JSON.stringify(await encryptJSONWithKey(bundle, k))
  return { text, bytes: new TextEncoder().encode(text).length, sha256: await sha256Hex(text) }
}

/** A clock that moves one minute at each reading, so each copy has its own name. */
function clock(start = '2026-10-13T08:00:00Z') {
  let t = new Date(start).getTime()
  return () => new Date((t += 60_000))
}

test('copy names are in UTC, sort in time order, and read back', () => {
  const at = new Date('2026-10-13T08:12:05Z')
  assert.equal(copyName(at), 'ouch-20261013-081205.json')
  assert.equal(copyNameDate('ouch-20261013-081205.json')?.toISOString(), at.toISOString())
  assert.ok(copyName(new Date('2026-10-13T08:12:05Z')) < copyName(new Date('2026-10-13T08:12:06Z')))
  for (const other of ['notes.txt', 'ouch-2026-10-13.json', 'ouch-20261013-081205.json.bak', 'OUCH-20261013-081205.json']) {
    assert.equal(copyNameDate(other), null)
  }
})

test('a copy is due when the journal changed since the last good one', () => {
  const now = 10_000_000
  assert.equal(isBackupDue({ now }), false)
  assert.equal(isBackupDue({ now, latestChangeAt: 5 }), true)
  assert.equal(isBackupDue({ now, latestChangeAt: 5, lastCopyAt: 5 }), false)
  assert.equal(isBackupDue({ now, latestChangeAt: 6, lastCopyAt: 5 }), true)
})

test('copies are not tried again within the minimum gap, whether or not the last one worked', () => {
  const base = { now: 10_000_000, latestChangeAt: 5 }
  assert.equal(isBackupDue({ ...base, lastAttemptAt: base.now - MIN_GAP_MS + 1 }), false)
  assert.equal(isBackupDue({ ...base, lastAttemptAt: base.now - MIN_GAP_MS }), true)
})

test('a copy is sent, read back, checked, and reported', async () => {
  const provider = memoryProvider()
  const out = await runBackup({ provider, backupKey: key, makeCopy, now: clock() })
  assert.ok(out.ok)
  if (!out.ok) return
  assert.equal(provider.files.size, 1)
  assert.ok(provider.files.has(out.copy.name))
  assert.equal(out.copy.sha256, await sha256Hex(provider.files.get(out.copy.name)!.text))
  assert.deepEqual(await decryptJSON(JSON.parse(provider.files.get(out.copy.name)!.text), 'mot de passe'), bundle)
})

test('only the newest copies stay, and files that are not ours are left alone', async () => {
  const provider = memoryProvider()
  provider.files.set('photo.jpg', { text: 'x', modifiedAt: '2020-01-01T00:00:00Z' })
  const now = clock()
  for (let i = 0; i < COPIES_KEPT + 2; i++) assert.ok((await runBackup({ provider, backupKey: key, makeCopy, now })).ok)
  const names = [...provider.files.keys()].sort()
  assert.equal(names.length, COPIES_KEPT + 1)
  assert.ok(names.includes('photo.jpg'))
  const listed = await listCopies(provider)
  assert.equal(listed.length, COPIES_KEPT)
  assert.ok(listed[0]!.at > listed[1]!.at)
})

test('a copy that comes back different is not good: it is removed, the older ones stay', async () => {
  const provider = memoryProvider()
  const now = clock()
  assert.ok((await runBackup({ provider, backupKey: key, makeCopy, now })).ok)
  provider.alterOnDownload = (_n, text) => text.replace('OUCH1', 'OUCH2')
  const out = await runBackup({ provider, backupKey: key, makeCopy, now })
  assert.deepEqual(out, { ok: false, reason: 'mismatch' })
  assert.equal(provider.files.size, 1)
})

test('a copy that is identical but does not open is "unreadable"', async () => {
  const provider = memoryProvider()
  const broken = async (k: BackupKey) => {
    const good = await makeCopy(k)
    const payload = JSON.parse(good.text)
    payload.ciphertext = (payload.ciphertext[0] === 'A' ? 'B' : 'A') + payload.ciphertext.slice(1)
    const text = JSON.stringify(payload)
    return { text, bytes: text.length, sha256: await sha256Hex(text) }
  }
  assert.deepEqual(await runBackup({ provider, backupKey: key, makeCopy: broken, now: clock() }), { ok: false, reason: 'unreadable' })
  assert.equal(provider.files.size, 0)
})

test('a failure is reported in terms the person can act on, and nothing is half-written', async () => {
  for (const kind of ['auth', 'network', 'quota'] as const) {
    const provider = memoryProvider()
    provider.failWith = kind
    assert.deepEqual(await runBackup({ provider, backupKey: key, makeCopy, now: clock() }), { ok: false, reason: kind })
    assert.equal(provider.files.size, 0)
  }
  const out = await runBackup({
    provider: memoryProvider(),
    backupKey: key,
    makeCopy: async () => {
      throw new Error('boom')
    },
  })
  assert.deepEqual(out, { ok: false, reason: 'other' })
})

test('copies are listed newest first, and one can be taken as a file for the existing restore', async () => {
  const provider = memoryProvider()
  const now = clock()
  const first = await runBackup({ provider, backupKey: key, makeCopy, now })
  const second = await runBackup({ provider, backupKey: key, makeCopy, now })
  assert.ok(first.ok && second.ok)
  if (!first.ok || !second.ok) return
  const listed = await listCopies(provider)
  assert.deepEqual(listed.map((c) => c.name), [second.copy.name, first.copy.name])
  const file = await copyAsFile(provider, second.copy.name)
  assert.deepEqual(await decryptJSON(JSON.parse(await file.text()), 'mot de passe'), bundle)
})
