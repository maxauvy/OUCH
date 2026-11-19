// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dropboxFetchUrl, dropboxImageLink, duoUrl, readDuoHash, readDuoInput } from '../src/lib/duoLink.ts'

const LINK = 'https://www.dropbox.com/scl/fi/abc123xyz/meteo-du-jour.ouch?rlkey=k3y&raw=1'
const KEY = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCdE'
const BASE = 'https://maxauvy.github.io/OUCH/duo/'

test('a Dropbox shared link is kept, in the form that serves the file', () => {
  assert.equal(dropboxImageLink(LINK), LINK)
  assert.equal(dropboxImageLink('https://www.dropbox.com/scl/fi/abc123xyz/meteo-du-jour.ouch?rlkey=k3y&dl=0'), LINK)
  assert.equal(dropboxImageLink('  https://dl.dropboxusercontent.com/scl/fi/abc123xyz/meteo-du-jour.ouch?rlkey=k3y  '), LINK)
  assert.equal(dropboxImageLink('https://www.dropbox.com/s/old1/meteo.ouch?dl=0'), 'https://www.dropbox.com/s/old1/meteo.ouch?raw=1')
})

test('anything that is not a Dropbox shared link to a file is refused', () => {
  for (const bad of [
    'http://www.dropbox.com/scl/fi/abc/meteo.ouch?rlkey=k',
    'https://evil.example/scl/fi/abc/meteo.ouch',
    'https://www.dropbox.com.evil.example/scl/fi/abc/meteo.ouch',
    'https://user:pw@www.dropbox.com/scl/fi/abc/meteo.ouch',
    'https://www.dropbox.com/home',
    'https://www.dropbox.com/scl/fi/abc',
    'javascript:alert(1)',
    'pas un lien',
    '',
  ]) {
    assert.equal(dropboxImageLink(bad), null, bad)
  }
})

test('the fetch address goes straight to the content host, without raw or dl', () => {
  assert.equal(dropboxFetchUrl(LINK), 'https://dl.dropboxusercontent.com/scl/fi/abc123xyz/meteo-du-jour.ouch?rlkey=k3y')
})

test('the Duo address carries the link, the key and the name after #, and reads back the same', () => {
  const url = duoUrl(BASE, { link: LINK, key: KEY, name: 'Claire' })
  assert.ok(url.startsWith(`${BASE}#`))
  assert.deepEqual(readDuoHash(new URL(url).hash), { link: LINK, key: KEY, name: 'Claire' })
  assert.deepEqual(readDuoInput(url), { link: LINK, key: KEY, name: 'Claire' })
})

test('the name is optional, trimmed and kept short', () => {
  assert.deepEqual(readDuoHash(new URL(duoUrl(BASE, { link: LINK, key: KEY, name: '   ' })).hash), { link: LINK, key: KEY })
  assert.equal(readDuoHash(new URL(duoUrl(BASE, { link: LINK, key: KEY, name: ' Marie   Claire ' })).hash)?.name, 'Marie Claire')
  assert.equal(readDuoHash(new URL(duoUrl(BASE, { link: LINK, key: KEY, name: 'x'.repeat(100) })).hash)?.name?.length, 40)
  assert.deepEqual(readDuoHash(`#l=${encodeURIComponent(LINK)}&k=${KEY}&n=Jos%C3%A9%20%26%20Co`), { link: LINK, key: KEY, name: 'José & Co' })
})

test('without a key, or with a foreign link, there is nothing to follow; a bare Dropbox link is not enough', () => {
  assert.equal(readDuoHash(`#l=${encodeURIComponent(LINK)}`), null)
  assert.equal(readDuoHash(`#l=${encodeURIComponent(LINK)}&k=court`), null)
  assert.equal(readDuoInput(LINK), null)
  assert.equal(readDuoInput(`${BASE}#l=${encodeURIComponent('https://evil.example/a/b/c.ouch')}&k=${KEY}`), null)
  assert.equal(readDuoHash(''), null)
})
