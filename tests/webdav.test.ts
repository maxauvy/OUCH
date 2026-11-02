// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runBackup } from '../src/lib/autoBackup.ts'
import { createBackupKey, encryptJSONWithKey, sha256Hex, type BackupKey } from '../src/lib/crypto.ts'
import { failureOf } from '../src/lib/cloud/provider.ts'
import { checkConnection, isAcceptableUrl, normalizeUrl, parseListing, webdavProvider, type WebdavConfig } from '../src/lib/cloud/webdavProvider.ts'
import { startWebdavServer } from './helpers/webdavServer.ts'

const key = await createBackupKey('mot de passe')
const bundle = { version: 2, exportedAt: '2026-10-13T08:00:00.000Z', entries: [{ date: '2026-10-12' }] }
async function makeCopy(k: BackupKey) {
  const text = JSON.stringify(await encryptJSONWithKey(bundle, k))
  return { text, bytes: new TextEncoder().encode(text).length, sha256: await sha256Hex(text) }
}
function clock(start = '2026-10-13T08:00:00Z') {
  let t = new Date(start).getTime()
  return () => new Date((t += 60_000))
}
/** Why the test failed, or 'ok'. */
const problemOf = async (c: WebdavConfig) => {
  const r = await checkConnection(c)
  return r.ok ? 'ok' : r.problem
}
const config = (url: string, extra: Partial<WebdavConfig> = {}): WebdavConfig => ({ url, user: 'moi', password: 'secret', ...extra })

test('only secure addresses, or the machine itself, are accepted', () => {
  assert.ok(isAcceptableUrl('https://cloud.example.com/remote.php/dav/files/me/'))
  assert.ok(isAcceptableUrl('http://localhost:8080/'))
  assert.ok(isAcceptableUrl('http://127.0.0.1:8080/'))
  for (const bad of ['http://cloud.example.com/', 'ftp://x/', 'cloud.example.com', '']) assert.equal(isAcceptableUrl(bad), false)
})

test('an address gets one trailing slash and loses what was pasted around it', () => {
  assert.equal(normalizeUrl(' https://a.example/dav '), 'https://a.example/dav/')
  assert.equal(normalizeUrl('https://a.example/dav/?x=1#y'), 'https://a.example/dav/')
})

test('a listing is read whatever prefix the server picks, folders are skipped, names are decoded', () => {
  const xml = `<?xml version="1.0"?><D:multistatus xmlns:D="DAV:">
    <D:response><D:href>/dav/OUCH/</D:href><D:propstat><D:prop><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response>
    <D:response><D:href>/dav/OUCH/ouch-20261013-081205.json</D:href><D:propstat><D:prop><D:resourcetype/><D:getcontentlength>1234</D:getcontentlength><D:getlastmodified>Tue, 13 Oct 2026 08:12:05 GMT</D:getlastmodified></D:prop></D:propstat></D:response>
    <D:response><D:href>/dav/OUCH/a%20b&amp;c.txt</D:href><D:propstat><D:prop><D:getcontentlength>5</D:getcontentlength></D:prop></D:propstat></D:response>
  </D:multistatus>`
  assert.deepEqual(parseListing(xml), [
    { name: 'ouch-20261013-081205.json', size: 1234, modifiedAt: '2026-10-13T08:12:05.000Z' },
    { name: 'a b&c.txt', size: 5, modifiedAt: '' },
  ])
  assert.deepEqual(parseListing('<multistatus><response><href>/x/f.json</href><getcontentlength>7</getcontentlength></response></multistatus>'), [
    { name: 'f.json', size: 7, modifiedAt: '' },
  ])
  assert.deepEqual(parseListing(''), [])
})

test('against a real server: the folder is made, a copy is sent, read back, checked and listed, and old ones go', async () => {
  const server = await startWebdavServer()
  try {
    const provider = webdavProvider(async () => config(server.url))
    assert.deepEqual(await provider.list(), []) // no folder yet
    const now = clock()
    for (let i = 0; i < 5; i++) {
      const out = await runBackup({ provider, backupKey: key, makeCopy, now })
      assert.ok(out.ok, JSON.stringify(out))
    }
    assert.ok(server.folders.has('/OUCH/'))
    assert.equal(server.files.size, 3)
    assert.ok([...server.files.keys()].every((p) => p.startsWith('/OUCH/ouch-')))
    assert.equal((await provider.list()).length, 3)
    assert.equal(server.requests.filter((r) => r.startsWith('MKCOL')).length, 1) // the folder is made once
  } finally {
    await server.close()
  }
})

test('the folder may already be there, and a missing file is not an error to remove', async () => {
  const server = await startWebdavServer()
  try {
    server.folders.add('/OUCH/')
    const provider = webdavProvider(async () => config(server.url))
    await provider.upload('a.json', 'x')
    assert.equal(await provider.download('a.json'), 'x')
    await provider.remove('a.json')
    await provider.remove('a.json')
    await assert.rejects(provider.download('a.json'), (e) => failureOf(e) === 'other')
  } finally {
    await server.close()
  }
})

test('wrong credentials are an `auth` failure; a server that is off is a `network` one', async () => {
  const server = await startWebdavServer()
  const provider = webdavProvider(async () => config(server.url, { password: 'wrong' }))
  await assert.rejects(provider.upload('a.json', 'x'), (e) => failureOf(e) === 'auth')
  await assert.rejects(provider.list(), (e) => failureOf(e) === 'auth')
  const url = server.url
  await server.close()
  await assert.rejects(webdavProvider(async () => config(url)).list(), (e) => failureOf(e) === 'network')
})

test('the connection test says what is wrong, and leaves nothing behind when it works', async () => {
  const server = await startWebdavServer()
  try {
    assert.deepEqual(await checkConnection(config(server.url)), { ok: true })
    assert.equal(server.files.size, 0)
    assert.equal(await problemOf(config(server.url, { password: 'wrong' })), 'auth')
    assert.equal(await problemOf(config(`${server.url}nowhere/`)), 'notfound')
    assert.equal(await problemOf(config('http://cloud.example.com/')), 'insecure')
    assert.equal(await problemOf(config('')), 'invalid')
    assert.equal(await problemOf(config(server.url, { user: ' ' })), 'invalid')
  } finally {
    await server.close()
  }
  assert.equal(await problemOf(config(server.url)), 'unreachable')
})
