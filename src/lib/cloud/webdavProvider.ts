// A WebDAV server (Nextcloud, ownCloud, a NAS) as a place for copies: the
// four calls on a folder of its own, `OUCH/`, made under the address the person
// gave. The page talks to the server straight from the browser, so the server
// has to allow it (CORS); `checkConnection` finds out what is missing.

import { ProviderError, type BackupProvider, type RemoteCopy } from './provider.ts'

export interface WebdavConfig {
  /** The address of a folder on the server, ending in `/`. Copies go in its `OUCH/` folder. */
  url: string
  user: string
  /** An app password, never the account's own. */
  password: string
}

type Fetch = typeof fetch

const FOLDER = 'OUCH'

/** Only a secure address, or the machine's own (to try things out). */
export function isAcceptableUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol === 'https:') return true
  return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')
}

/** The address with one trailing slash, and nothing the person may have pasted around it. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/[?#].*$/, '')
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function basic(user: string, password: string): string {
  const bytes = new TextEncoder().encode(`${user}:${password}`)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `Basic ${btoa(binary)}`
}

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

const tag = (name: string) => new RegExp(`<(?:[\\w-]+:)?${name}[^>]*>([^<]*)<`, 'i')

/** The files in a PROPFIND answer (depth 1). Tolerant of the prefix the server picks (`d:`, `D:`, none). */
export function parseListing(xml: string): RemoteCopy[] {
  const copies: RemoteCopy[] = []
  for (const block of xml.split(/<(?:[\w-]+:)?response[\s>]/i).slice(1)) {
    if (/<(?:[\w-]+:)?collection\s*\/?>/i.test(block)) continue
    const href = tag('href').exec(block)?.[1]
    if (!href) continue
    const segments = decodeEntities(href).split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (!last) continue
    let name: string
    try {
      name = decodeURIComponent(last)
    } catch {
      name = last
    }
    const size = Number(tag('getcontentlength').exec(block)?.[1])
    const when = Date.parse(decodeEntities(tag('getlastmodified').exec(block)?.[1] ?? ''))
    copies.push({
      name,
      size: Number.isFinite(size) ? size : 0,
      modifiedAt: Number.isNaN(when) ? '' : new Date(when).toISOString(),
    })
  }
  return copies
}

/** What the server answered, in the terms of `ProviderError`. */
function failureFrom(res: Response, op: string): ProviderError {
  const detail = `${op} ${res.status}`
  if (res.status === 401 || res.status === 403) return new ProviderError('auth', detail)
  if (res.status === 507) return new ProviderError('quota', detail)
  if (res.status === 408 || res.status === 429 || res.status >= 500) return new ProviderError('network', detail)
  return new ProviderError('other', detail)
}

const PROPFIND_BODY =
  '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/></d:prop></d:propfind>'

/** `getConfig` gives the address and the credentials, or throws `ProviderError('auth')` when there are none. */
export function webdavProvider(getConfig: () => Promise<WebdavConfig>, fetchFn: Fetch = fetch): BackupProvider {
  let folderReady = false

  async function call(op: string, path: string, init: { method: string; headers?: Record<string, string>; body?: string }): Promise<Response> {
    const config = await getConfig()
    let res: Response
    try {
      res = await fetchFn(`${config.url}${path}`, {
        ...init,
        cache: 'no-store',
        credentials: 'omit',
        headers: { ...init.headers, Authorization: basic(config.user, config.password) },
      })
    } catch (e) {
      // A server that does not allow this page (CORS) looks like no answer at all.
      throw new ProviderError('network', `${op} ${e instanceof Error ? e.message : 'no answer'}`)
    }
    return res
  }

  async function ensureFolder(): Promise<void> {
    if (folderReady) return
    const res = await call('folder', `${FOLDER}/`, { method: 'MKCOL' })
    // 405: it is already there.
    if (!res.ok && res.status !== 405) throw failureFrom(res, 'folder')
    folderReady = true
  }

  const fileAt = (name: string) => `${FOLDER}/${encodeURIComponent(name)}`

  return {
    id: 'webdav',

    async upload(name, text) {
      await ensureFolder()
      const res = await call('upload', fileAt(name), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: text,
      })
      if (!res.ok) throw failureFrom(res, 'upload')
    },

    async list() {
      const res = await call('list', `${FOLDER}/`, {
        method: 'PROPFIND',
        headers: { Depth: '1', 'Content-Type': 'application/xml' },
        body: PROPFIND_BODY,
      })
      // No folder yet: nothing was sent yet.
      if (res.status === 404) return []
      if (!res.ok) throw failureFrom(res, 'list')
      return parseListing(await res.text())
    },

    async download(name) {
      const res = await call('download', fileAt(name), { method: 'GET' })
      if (!res.ok) throw failureFrom(res, 'download')
      return res.text()
    },

    async remove(name) {
      const res = await call('remove', fileAt(name), { method: 'DELETE' })
      // Already gone is as good as removed.
      if (!res.ok && res.status !== 404) throw failureFrom(res, 'remove')
    },
  }
}

/** Why a connection does not work, in the terms the person can act on. */
export type ConnectionProblem = 'invalid' | 'insecure' | 'unreachable' | 'auth' | 'notfound' | 'refused'

export type ConnectionCheck = { ok: true } | { ok: false; problem: ConnectionProblem; detail?: string }

/**
 * Tries what a backup needs, in order: read the address, make the `OUCH/`
 * folder, write a file, read it back, delete it. `unreachable` covers a server
 * that is off, an address that does not exist and a server that does not allow
 * this page (CORS): the browser does not tell them apart.
 */
export async function checkConnection(config: WebdavConfig, fetchFn: Fetch = fetch): Promise<ConnectionCheck> {
  if (!config.url.trim() || !config.user.trim() || !config.password) return { ok: false, problem: 'invalid' }
  const url = normalizeUrl(config.url)
  if (!isAcceptableUrl(url)) return { ok: false, problem: url.startsWith('http:') ? 'insecure' : 'invalid' }
  const checked: WebdavConfig = { ...config, url, user: config.user.trim() }
  const probe = webdavProvider(async () => checked, fetchFn)
  try {
    const root = await fetchFn(url, {
      method: 'PROPFIND',
      cache: 'no-store',
      credentials: 'omit',
      headers: { Depth: '0', 'Content-Type': 'application/xml', Authorization: basic(checked.user, checked.password) },
      body: PROPFIND_BODY,
    })
    if (root.status === 401 || root.status === 403) return { ok: false, problem: 'auth', detail: `address ${root.status}` }
    if (root.status === 404) return { ok: false, problem: 'notfound', detail: 'address 404' }
    if (!root.ok) return { ok: false, problem: 'refused', detail: `address ${root.status}` }
    const name = '.ouch-test'
    await probe.upload(name, 'ouch')
    const back = await probe.download(name)
    await probe.remove(name)
    return back === 'ouch' ? { ok: true } : { ok: false, problem: 'refused', detail: 'read-back differs' }
  } catch (e) {
    if (e instanceof ProviderError) {
      if (e.kind === 'auth') return { ok: false, problem: 'auth', detail: e.message }
      // A failure of the network kind from a reached server (5xx) is a refusal; no answer at all is `unreachable`.
      return { ok: false, problem: /\d{3}/.test(e.message) ? 'refused' : 'unreachable', detail: e.message }
    }
    return { ok: false, problem: 'unreachable', detail: e instanceof Error ? e.message : undefined }
  }
}
