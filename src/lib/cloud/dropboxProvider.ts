// Dropbox as a place for copies: four calls on OUCH's own folder (the app is
// registered with "App folder" access, so the folder's root is `""`).

import { ProviderError, type BackupProvider, type RemoteCopy } from './provider.ts'

const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'

type Fetch = typeof fetch

/** What Dropbox answered, in the terms of `ProviderError`. */
async function failureFrom(res: Response, op: string): Promise<ProviderError> {
  // Most answers are JSON; some errors (a missing permission on the list) are plain text.
  const raw = await res.text().catch(() => '')
  let summary = ''
  let words = ''
  try {
    const body = JSON.parse(raw) as { error_summary?: unknown; user_message?: { text?: unknown } }
    summary = String(body.error_summary ?? '')
    words = typeof body.user_message?.text === 'string' ? body.user_message.text : ''
  } catch {
    words = raw
  }
  // The words go with the failure for whoever has to find out what went wrong: nothing here is the person's data.
  const said = (words || summary).replace(/\s+/g, ' ').trim().slice(0, 200)
  const detail = `${op} ${res.status}${said ? ` ${said}` : ''}`
  if (res.status === 401) return new ProviderError('auth', detail)
  if (res.status === 409 && summary.includes('insufficient_space')) return new ProviderError('quota', detail)
  if (res.status === 429 || res.status >= 500) return new ProviderError('network', detail)
  return new ProviderError('other', detail)
}

/** `getToken` gives a valid access token (refreshing it if need be), or throws `ProviderError('auth')`. */
export function dropboxProvider(getToken: () => Promise<string>, fetchFn: Fetch = fetch): BackupProvider {
  async function call(op: string, url: string, init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }): Promise<Response> {
    const token = await getToken()
    let res: Response
    try {
      res = await fetchFn(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
    } catch (e) {
      throw new ProviderError('network', `${op} ${e instanceof Error ? e.message : 'no answer'}`)
    }
    if (!res.ok) throw await failureFrom(res, op)
    return res
  }

  const json = (op: string, url: string, body: unknown) =>
    call(op, url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  return {
    id: 'dropbox',

    async upload(name, text) {
      await call('upload', `${CONTENT}/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({ path: `/${name}`, mode: 'overwrite', autorename: false, mute: true }),
        },
        body: text,
      })
    },

    async list() {
      const copies: RemoteCopy[] = []
      let res = await json('list', `${API}/files/list_folder`, { path: '' })
      for (;;) {
        const page = (await res.json()) as {
          entries: { '.tag': string; name: string; size?: number; server_modified?: string }[]
          cursor: string
          has_more: boolean
        }
        for (const e of page.entries) {
          if (e['.tag'] === 'file') copies.push({ name: e.name, size: e.size ?? 0, modifiedAt: e.server_modified ?? '' })
        }
        if (!page.has_more) return copies
        res = await json('list', `${API}/files/list_folder/continue`, { cursor: page.cursor })
      }
    },

    async download(name) {
      const res = await call('download', `${CONTENT}/files/download`, {
        method: 'POST',
        headers: { 'Dropbox-API-Arg': JSON.stringify({ path: `/${name}` }) },
      })
      return res.text()
    },

    async remove(name) {
      await json('remove', `${API}/files/delete_v2`, { path: `/${name}` })
    },
  }
}
