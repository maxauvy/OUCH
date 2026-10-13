// Run with `npm test` (plain Node, no test framework: Node strips the types).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { challengeFor, randomToken } from '../src/lib/cloud/pkce.ts'
import { authorizeUrl, DROPBOX_APP_KEY, DropboxAuthError, exchangeCode, redirectUri, refreshTokens } from '../src/lib/cloud/dropboxAuth.ts'
import { dropboxProvider } from '../src/lib/cloud/dropboxProvider.ts'
import { ProviderError } from '../src/lib/cloud/provider.ts'

interface Call {
  url: string
  init: RequestInit
}

/** A fetch that records its calls and answers from a queue. */
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

const ok = (body: unknown, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
const header = (call: Call, name: string) => (call.init.headers as Record<string, string>)[name]

test('PKCE: the challenge of the RFC 7636 example verifier', async () => {
  assert.equal(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
})

test('random tokens are URL-safe and never the same twice', () => {
  const a = randomToken(48)
  assert.match(a, /^[A-Za-z0-9_-]+$/)
  assert.ok(a.length >= 43)
  assert.notEqual(a, randomToken(48))
})

test('the redirect address is the app\'s own', () => {
  assert.equal(redirectUri('https://maxauvy.github.io', '/OUCH/'), 'https://maxauvy.github.io/OUCH/')
  assert.equal(redirectUri('http://localhost:5173', '/'), 'http://localhost:5173/')
})

test('the link address asks for a refresh token and carries the PKCE challenge, never the verifier', async () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  const url = new URL(await authorizeUrl({ verifier, state: 's1', redirect: 'https://maxauvy.github.io/OUCH/' }))
  assert.equal(url.origin + url.pathname, 'https://www.dropbox.com/oauth2/authorize')
  const p = url.searchParams
  assert.equal(p.get('client_id'), DROPBOX_APP_KEY)
  assert.equal(p.get('response_type'), 'code')
  assert.equal(p.get('code_challenge'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  assert.equal(p.get('code_challenge_method'), 'S256')
  assert.equal(p.get('token_access_type'), 'offline')
  assert.equal(p.get('state'), 's1')
  assert.equal(p.get('redirect_uri'), 'https://maxauvy.github.io/OUCH/')
  assert.ok(!url.href.includes(verifier))
})

test('the code is traded for tokens with the verifier, and no secret', async () => {
  const { fn, calls } = fakeFetch(ok({ access_token: 'a1', refresh_token: 'r1', expires_in: 14400 }))
  const tokens = await exchangeCode({ code: 'c', verifier: 'v', redirect: 'https://x/' }, fn, 1000)
  assert.deepEqual(tokens, { accessToken: 'a1', refreshToken: 'r1', expiresAt: 1000 + 14400 * 1000 })
  assert.equal(calls[0]!.url, 'https://api.dropboxapi.com/oauth2/token')
  const body = calls[0]!.init.body as URLSearchParams
  assert.equal(body.get('grant_type'), 'authorization_code')
  assert.equal(body.get('code_verifier'), 'v')
  assert.equal(body.get('client_id'), DROPBOX_APP_KEY)
  assert.equal(body.has('client_secret'), false)
})

test('a refresh keeps the refresh token, and a withdrawn link is "revoked"', async () => {
  const fine = fakeFetch(ok({ access_token: 'a2', expires_in: 100 }))
  assert.deepEqual(await refreshTokens('r1', fine.fn, 0), { accessToken: 'a2', refreshToken: 'r1', expiresAt: 100_000 })
  assert.equal((fine.calls[0]!.init.body as URLSearchParams).get('grant_type'), 'refresh_token')

  const gone = fakeFetch(ok({ error: 'invalid_grant' }, 400))
  await assert.rejects(() => refreshTokens('r1', gone.fn), (e: unknown) => e instanceof DropboxAuthError && e.kind === 'revoked')
  const offline = fakeFetch(new TypeError('Failed to fetch'))
  await assert.rejects(() => refreshTokens('r1', offline.fn), (e: unknown) => e instanceof DropboxAuthError && e.kind === 'network')
})

test('upload: the path is in the Dropbox-API-Arg header, the text is the body, an existing file is replaced', async () => {
  const { fn, calls } = fakeFetch(ok({}))
  await dropboxProvider(async () => 'tok', fn).upload('ouch-1.json', '{"a":1}')
  const c = calls[0]!
  assert.equal(c.url, 'https://content.dropboxapi.com/2/files/upload')
  assert.equal(header(c, 'Authorization'), 'Bearer tok')
  assert.equal(header(c, 'Content-Type'), 'application/octet-stream')
  assert.deepEqual(JSON.parse(header(c, 'Dropbox-API-Arg')!), { path: '/ouch-1.json', mode: 'overwrite', autorename: false, mute: true })
  assert.equal(c.init.body, '{"a":1}')
})

test('list: files only, and every page', async () => {
  const { fn, calls } = fakeFetch(
    ok({ entries: [{ '.tag': 'file', name: 'a.json', size: 10, server_modified: '2026-10-13T08:00:00Z' }, { '.tag': 'folder', name: 'x' }], cursor: 'k', has_more: true }),
    ok({ entries: [{ '.tag': 'file', name: 'b.json', size: 20, server_modified: '2026-10-12T08:00:00Z' }], cursor: 'k2', has_more: false })
  )
  const copies = await dropboxProvider(async () => 'tok', fn).list()
  assert.deepEqual(copies, [
    { name: 'a.json', size: 10, modifiedAt: '2026-10-13T08:00:00Z' },
    { name: 'b.json', size: 20, modifiedAt: '2026-10-12T08:00:00Z' },
  ])
  assert.equal(calls[0]!.url, 'https://api.dropboxapi.com/2/files/list_folder')
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { path: '' })
  assert.equal(calls[1]!.url, 'https://api.dropboxapi.com/2/files/list_folder/continue')
  assert.deepEqual(JSON.parse(calls[1]!.init.body as string), { cursor: 'k' })
})

test('download gives the text back, remove asks for the path', async () => {
  const dl = fakeFetch(ok('le contenu'))
  assert.equal(await dropboxProvider(async () => 'tok', dl.fn).download('a.json'), 'le contenu')
  assert.equal(dl.calls[0]!.url, 'https://content.dropboxapi.com/2/files/download')
  assert.deepEqual(JSON.parse(header(dl.calls[0]!, 'Dropbox-API-Arg')!), { path: '/a.json' })
  const rm = fakeFetch(ok({}))
  await dropboxProvider(async () => 'tok', rm.fn).remove('a.json')
  assert.equal(rm.calls[0]!.url, 'https://api.dropboxapi.com/2/files/delete_v2')
  assert.deepEqual(JSON.parse(rm.calls[0]!.init.body as string), { path: '/a.json' })
})

test('failures are named for what the person can do', async () => {
  const kind = async (answer: Response | Error) => {
    try {
      await dropboxProvider(async () => 'tok', fakeFetch(answer).fn).download('a.json')
    } catch (e) {
      return e instanceof ProviderError ? e.kind : 'not a ProviderError'
    }
    return 'no error'
  }
  assert.equal(await kind(ok({ error_summary: 'expired_access_token/' }, 401)), 'auth')
  assert.equal(await kind(ok({ error_summary: 'path/insufficient_space/..' }, 409)), 'quota')
  assert.equal(await kind(ok({ error_summary: 'too_many_requests/' }, 429)), 'network')
  assert.equal(await kind(ok('oops', 503)), 'network')
  assert.equal(await kind(new TypeError('Failed to fetch')), 'network')
  assert.equal(await kind(ok({ error_summary: 'path/not_found/..' }, 409)), 'other')
})

test('a token that cannot be had is the provider\'s "auth"', async () => {
  const noToken = dropboxProvider(async () => {
    throw new ProviderError('auth')
  }, fakeFetch().fn)
  await assert.rejects(() => noToken.list(), (e: unknown) => e instanceof ProviderError && e.kind === 'auth')
})

test('what Dropbox says is kept with the failure, whether it is JSON or plain text', async () => {
  const detail = async (answer: Response, run: (p: ReturnType<typeof dropboxProvider>) => Promise<unknown>) => {
    try {
      await run(dropboxProvider(async () => 'tok', fakeFetch(answer).fn))
    } catch (e) {
      return e instanceof Error ? e.message : ''
    }
    return ''
  }
  const json = ok({ error: { '.tag': 'other' }, error_summary: 'other/...', user_message: { text: "it does not have the required scope 'files.content.write'" } }, 400)
  assert.equal(await detail(json, (p) => p.upload('a.json', 'x')), "upload 400 it does not have the required scope 'files.content.write'")
  const text = ok("Error in call to API function \"files/list_folder\": missing scope 'files.metadata.read'.", 400)
  assert.match(await detail(text, (p) => p.list()), /^list 400 Error in call to API function .*files\.metadata\.read/)
  assert.equal(await detail(ok({ error_summary: 'path/not_found/..' }, 409), (p) => p.download('a.json')), 'download 409 path/not_found/..')
})
