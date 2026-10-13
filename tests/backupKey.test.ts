// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createBackupKey,
  decryptJSON,
  decryptJSONWithKey,
  encryptJSON,
  encryptJSONWithKey,
  sha256Hex,
} from '../src/lib/crypto.ts'
import { checkCopyOpens, matchesSent, shortFingerprint } from '../src/lib/backupIntegrity.ts'

const bundle = { version: 2, exportedAt: '2026-10-13T08:00:00.000Z', entries: [{ date: '2026-10-12' }, { date: '2026-10-13' }] }
const keyed = await createBackupKey('mot de passe')

test('a copy made with the kept key opens with the password, like a manual backup', async () => {
  const payload = await encryptJSONWithKey(bundle, keyed)
  assert.deepEqual(await decryptJSON(payload, 'mot de passe'), bundle)
  await assert.rejects(() => decryptJSON(payload, 'autre mot de passe'))
})

test('every copy has its own IV and the key keeps its salt', async () => {
  const a = await encryptJSONWithKey(bundle, keyed)
  const b = await encryptJSONWithKey(bundle, keyed)
  assert.notEqual(a.iv, b.iv)
  assert.notEqual(a.ciphertext, b.ciphertext)
  assert.equal(a.salt, keyed.salt)
  assert.equal(a.iterations, keyed.iterations)
})

test('the kept key opens its own copies without the password', async () => {
  const opened = await decryptJSONWithKey(await encryptJSONWithKey(bundle, keyed), keyed)
  assert.deepEqual(opened, { ok: true, data: bundle })
})

test('a file written with another salt is "otherKey", not "corrupt"', async () => {
  const manual = await encryptJSON(bundle, 'mot de passe')
  assert.deepEqual(await decryptJSONWithKey(manual, keyed), { ok: false, reason: 'otherKey' })
})

test('a changed byte makes the copy "corrupt"', async () => {
  const payload = await encryptJSONWithKey(bundle, keyed)
  const first = payload.ciphertext[0] === 'A' ? 'B' : 'A'
  const altered = { ...payload, ciphertext: first + payload.ciphertext.slice(1) }
  assert.deepEqual(await decryptJSONWithKey(altered, keyed), { ok: false, reason: 'corrupt' })
})

test('something that is not a backup is "format"', async () => {
  for (const junk of [null, 'x', {}, { magic: 'OUCH1' }]) {
    assert.deepEqual(await decryptJSONWithKey(junk, keyed), { ok: false, reason: 'format' })
  }
})

test('SHA-256 of a text, as lowercase hex', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.equal(shortFingerprint(await sha256Hex('abc')), 'ba7816bf')
})

test('what comes back is compared with what was sent, to the byte', async () => {
  const sent = JSON.stringify(await encryptJSONWithKey(bundle, keyed))
  const hash = await sha256Hex(sent)
  assert.equal(await matchesSent(hash, sent), true)
  assert.equal(await matchesSent(hash, sent + ' '), false)
  assert.equal(await matchesSent(hash, sent.replace('OUCH1', 'OUCH2')), false)
})

test('checking a copy says how many days it holds, never what is in them', async () => {
  const text = JSON.stringify(await encryptJSONWithKey(bundle, keyed))
  assert.deepEqual(await checkCopyOpens(text, keyed), { ok: true, exportedAt: bundle.exportedAt, entries: 2 })
  assert.deepEqual(await checkCopyOpens('pas du json', keyed), { ok: false, reason: 'format' })
  const manual = JSON.stringify(await encryptJSON(bundle, 'mot de passe'))
  assert.deepEqual(await checkCopyOpens(manual, keyed), { ok: false, reason: 'otherKey' })
})
