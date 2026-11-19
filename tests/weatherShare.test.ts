// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authorizeUrl } from '../src/lib/cloud/dropboxAuth.ts'
import { dropboxWeatherImage, imageOnlyLink, LEGACY_WEATHER_IMAGE_PATH, WEATHER_IMAGE_PATH, WeatherShareError } from '../src/lib/cloud/dropboxWeatherImage.ts'

interface Call {
  url: string
  init: RequestInit
}

function fakeFetch(...answers: (Response | Error)[]) {
  const calls: Call[] = []
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const next = answers.shift()
    if (!next) throw new Error('no answer left')
    if (next instanceof Error) throw next
    return next
  }) as typeof fetch
  return { fn, calls }
}

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const header = (call: Call, name: string) => (call.init.headers as Record<string, string>)[name]
const token = async () => 'tok'
const SHARED = 'https://www.dropbox.com/scl/fi/abc/meteo-du-jour.png?rlkey=k1&dl=0'
const RAW = 'https://www.dropbox.com/scl/fi/abc/meteo-du-jour.png?rlkey=k1&raw=1'

test('authorize: one more permission on top of those given, only when asked', async () => {
  const plain = new URL(await authorizeUrl({ verifier: 'v'.repeat(43), state: 's', redirect: 'https://x/' }))
  assert.equal(plain.searchParams.get('scope'), null)
  assert.equal(plain.searchParams.get('include_granted_scopes'), null)
  const more = new URL(await authorizeUrl({ verifier: 'v'.repeat(43), state: 's', redirect: 'https://x/', scope: 'sharing.write' }))
  assert.equal(more.searchParams.get('scope'), 'sharing.write')
  assert.equal(more.searchParams.get('include_granted_scopes'), 'user')
  assert.equal(more.searchParams.get('token_access_type'), 'offline')
})

test('the link serves the image itself', () => {
  assert.equal(imageOnlyLink(SHARED), RAW)
})

test('upload replaces the image in place, under one fixed name', async () => {
  const f = fakeFetch(answer({ id: 'id:1', rev: 'r1' }))
  await dropboxWeatherImage(token, f.fn).upload(new Blob(['png']))
  assert.equal(f.calls[0].url, 'https://content.dropboxapi.com/2/files/upload')
  assert.deepEqual(JSON.parse(header(f.calls[0], 'Dropbox-API-Arg')), { path: WEATHER_IMAGE_PATH, mode: 'overwrite', autorename: false, mute: true })
  assert.equal(header(f.calls[0], 'Authorization'), 'Bearer tok')
})

test('link: made once, image only, with no settings (so an existing one comes back)', async () => {
  const f = fakeFetch(answer({ url: SHARED }))
  assert.equal(await dropboxWeatherImage(token, f.fn).link(), RAW)
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), { path: WEATHER_IMAGE_PATH })
})

test('link: said to exist without being given, it is asked for by name', async () => {
  const f = fakeFetch(
    answer({ error_summary: 'shared_link_already_exists/', error: { '.tag': 'shared_link_already_exists' } }, 409),
    answer({ links: [{ url: SHARED }], has_more: false })
  )
  assert.equal(await dropboxWeatherImage(token, f.fn).link(), RAW)
  assert.equal(f.calls[1].url, 'https://api.dropboxapi.com/2/sharing/list_shared_links')
  assert.deepEqual(JSON.parse(String(f.calls[1].init.body)), { path: WEATHER_IMAGE_PATH, direct_only: true })
})

test('link: the one that already exists is found again', async () => {
  const f = fakeFetch(
    answer({ error_summary: 'shared_link_already_exists/metadata/..', error: { '.tag': 'shared_link_already_exists', shared_link_already_exists: { metadata: { url: SHARED } } } }, 409)
  )
  assert.equal(await dropboxWeatherImage(token, f.fn).link(), RAW)
})

test('link without the sharing permission asks for it', async () => {
  const f = fakeFetch(answer({ error_summary: 'missing_scope/', error: { '.tag': 'missing_scope', required_scope: 'sharing.write' } }, 401))
  await assert.rejects(dropboxWeatherImage(token, f.fn).link(), (e: unknown) => e instanceof WeatherShareError && e.kind === 'permission')
})

test('an expired link to Dropbox is not mistaken for a missing permission', async () => {
  const f = fakeFetch(answer({ error_summary: 'expired_access_token/', error: { '.tag': 'expired_access_token' } }, 401))
  await assert.rejects(dropboxWeatherImage(token, f.fn).upload(new Blob(['x'])), (e: unknown) => e instanceof WeatherShareError && e.kind === 'auth')
})

test('no connection is a network failure', async () => {
  const f = fakeFetch(new TypeError('Failed to fetch'))
  await assert.rejects(dropboxWeatherImage(token, f.fn).upload(new Blob(['x'])), (e: unknown) => e instanceof WeatherShareError && e.kind === 'network')
})

test('remove ends the link; an image already gone is fine', async () => {
  const f = fakeFetch(answer({}), answer({ error_summary: 'path_lookup/not_found/..' }, 409))
  const image = dropboxWeatherImage(token, f.fn)
  await image.remove()
  await image.remove()
  assert.equal(f.calls[0].url, 'https://api.dropboxapi.com/2/files/delete_v2')
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), { path: WEATHER_IMAGE_PATH })
})

test('remove that fails says so (the link would stay)', async () => {
  const f = fakeFetch(answer({ error_summary: 'too_many_write_operations/' }, 429))
  await assert.rejects(dropboxWeatherImage(token, f.fn).remove(), (e: unknown) => e instanceof WeatherShareError && e.kind === 'network')
})

test('the encrypted image has its own name; the old one in the clear can be removed by its own', async () => {
  assert.equal(WEATHER_IMAGE_PATH, '/meteo-du-jour.ouch')
  const f = fakeFetch(answer({}))
  await dropboxWeatherImage(token, f.fn).remove(LEGACY_WEATHER_IMAGE_PATH)
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)), { path: '/meteo-du-jour.png' })
})
