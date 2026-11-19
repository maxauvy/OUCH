// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dropboxFetchUrl, dropboxImageLink, duoUrl, readDuoHash, readDuoInput } from '../src/lib/duoLink.ts'

const LINK = 'https://www.dropbox.com/scl/fi/abc123xyz/meteo-du-jour.png?rlkey=k3y&raw=1'
const BASE = 'https://maxauvy.github.io/OUCH/duo/'

test('a Dropbox shared link is kept, in the form that serves the image', () => {
  assert.equal(dropboxImageLink(LINK), LINK)
  assert.equal(dropboxImageLink('https://www.dropbox.com/scl/fi/abc123xyz/meteo-du-jour.png?rlkey=k3y&dl=0'), LINK)
  assert.equal(dropboxImageLink('  https://dl.dropboxusercontent.com/scl/fi/abc123xyz/meteo-du-jour.png?rlkey=k3y  '), LINK)
  assert.equal(dropboxImageLink('https://www.dropbox.com/s/old1/meteo.png?dl=0'), 'https://www.dropbox.com/s/old1/meteo.png?raw=1')
})

test('anything that is not a Dropbox shared link to a file is refused', () => {
  for (const bad of [
    'http://www.dropbox.com/scl/fi/abc/meteo.png?rlkey=k',
    'https://evil.example/scl/fi/abc/meteo.png',
    'https://www.dropbox.com.evil.example/scl/fi/abc/meteo.png',
    'https://user:pw@www.dropbox.com/scl/fi/abc/meteo.png',
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
  assert.equal(dropboxFetchUrl(LINK), 'https://dl.dropboxusercontent.com/scl/fi/abc123xyz/meteo-du-jour.png?rlkey=k3y')
})

test('the Duo address carries the link and the name after #, and reads back the same', () => {
  const url = duoUrl(BASE, { link: LINK, name: 'Claire' })
  assert.ok(url.startsWith(`${BASE}#`))
  assert.deepEqual(readDuoHash(new URL(url).hash), { link: LINK, name: 'Claire' })
  assert.deepEqual(readDuoInput(url), { link: LINK, name: 'Claire' })
})

test('the name is optional, trimmed and kept short', () => {
  assert.deepEqual(readDuoHash(new URL(duoUrl(BASE, { link: LINK, name: '   ' })).hash), { link: LINK })
  assert.equal(readDuoHash(new URL(duoUrl(BASE, { link: LINK, name: ' Marie   Claire ' })).hash)?.name, 'Marie Claire')
  assert.equal(readDuoHash(new URL(duoUrl(BASE, { link: LINK, name: 'x'.repeat(100) })).hash)?.name?.length, 40)
  assert.deepEqual(readDuoHash(`#l=${encodeURIComponent(LINK)}&n=Jos%C3%A9%20%26%20Co`), { link: LINK, name: 'José & Co' })
})

test('a pasted bare Dropbox link works, and a Duo address with a foreign link does not', () => {
  assert.deepEqual(readDuoInput(LINK), { link: LINK })
  assert.equal(readDuoInput(`${BASE}#l=${encodeURIComponent('https://evil.example/a/b/c.png')}`), null)
  assert.equal(readDuoHash(''), null)
})
