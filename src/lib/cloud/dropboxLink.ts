// Linking Dropbox from the page: what is remembered while the person is at
// Dropbox, the tokens once they are back, and the access token handed to the
// provider (refreshed when it is about to expire). The requests themselves are
// in `dropboxAuth.ts` and `dropboxProvider.ts`.
//
// The tokens only open OUCH's own folder at Dropbox, which holds files nobody
// can read without the backup password. They live in their own IndexedDB
// database, apart from the journal and from the backup key.

import { authorizeUrl, DropboxAuthError, exchangeCode, redirectUri, refreshTokens, type DropboxTokens } from './dropboxAuth.ts'
import { randomToken } from './pkce.ts'
import { ProviderError } from './provider.ts'

const PENDING_KEY = 'ouch:dropbox-pending'
/** The link has to be finished within this long of being started (ms). */
const PENDING_MAX_AGE_MS = 15 * 60 * 1000
/** An access token is renewed when it has less than this left (ms). */
const RENEW_MARGIN_MS = 60_000

const DB_NAME = 'ouch-dropbox'
const STORE = 'tokens'
const ID = 'main'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = work(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

function isTokens(v: unknown): v is DropboxTokens {
  const t = v as Partial<DropboxTokens> | undefined
  return !!t && typeof t.accessToken === 'string' && typeof t.refreshToken === 'string' && typeof t.expiresAt === 'number'
}

async function loadTokens(): Promise<DropboxTokens | null> {
  try {
    const found = await run<unknown>('readonly', (s) => s.get(ID))
    return isTokens(found) ? found : null
  } catch {
    return null
  }
}

const saveTokens = (tokens: DropboxTokens) => run('readwrite', (s) => s.put(tokens, ID))
const clearTokens = () => run('readwrite', (s) => s.delete(ID))

const redirect = () => redirectUri(location.origin, import.meta.env.BASE_URL)

/** Sends the person to Dropbox to agree. They come back to this address with `?code=…&state=…`. */
export async function startDropboxLink(): Promise<void> {
  const verifier = randomToken(48)
  const state = randomToken(16)
  localStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, at: Date.now() }))
  location.assign(await authorizeUrl({ verifier, state, redirect: redirect() }))
}

export type DropboxReturn = { code: string; state: string } | { denied: true } | null

/** What Dropbox put in the address when sending the person back, if anything. */
export function readDropboxReturn(search: string): DropboxReturn {
  const p = new URLSearchParams(search)
  if (p.has('error') && p.has('state')) return { denied: true }
  const code = p.get('code')
  const state = p.get('state')
  return code && state ? { code, state } : null
}

/** Takes the address back to the app's own, without what Dropbox added. */
export function cleanReturnAddress(): void {
  history.replaceState(null, '', `${location.pathname}${location.hash}`)
}

/** Finishes the link: checks that this is the link this page started, and keeps the tokens. */
export async function finishDropboxLink(code: string, state: string): Promise<boolean> {
  let pending: { verifier?: unknown; state?: unknown; at?: unknown } | null = null
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null')
  } catch {
    // Nothing usable was kept.
  }
  localStorage.removeItem(PENDING_KEY)
  if (!pending || pending.state !== state || typeof pending.verifier !== 'string') return false
  if (typeof pending.at !== 'number' || Date.now() - pending.at > PENDING_MAX_AGE_MS) return false
  try {
    await saveTokens(await exchangeCode({ code, verifier: pending.verifier, redirect: redirect() }))
    return true
  } catch {
    return false
  }
}

export function forgetPendingDropboxLink(): void {
  localStorage.removeItem(PENDING_KEY)
}

let renewing: Promise<string> | null = null

/** A working access token, renewed if it is about to expire. Throws `ProviderError`. */
export async function getDropboxToken(): Promise<string> {
  const tokens = await loadTokens()
  if (!tokens) throw new ProviderError('auth')
  if (tokens.expiresAt - Date.now() > RENEW_MARGIN_MS) return tokens.accessToken
  renewing ??= (async () => {
    try {
      const fresh = await refreshTokens(tokens.refreshToken)
      await saveTokens(fresh)
      return fresh.accessToken
    } catch (e) {
      if (e instanceof DropboxAuthError && e.kind === 'revoked') {
        await clearTokens()
        throw new ProviderError('auth')
      }
      throw new ProviderError(e instanceof DropboxAuthError && e.kind === 'network' ? 'network' : 'other')
    } finally {
      renewing = null
    }
  })()
  return renewing
}

/** Ends the link: Dropbox is told (when it can be reached), and the tokens go. */
export async function unlinkDropbox(): Promise<void> {
  const tokens = await loadTokens()
  if (tokens) {
    try {
      await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
    } catch {
      // Offline: the tokens still go, and the person can remove the app at Dropbox.
    }
  }
  await clearTokens().catch(() => undefined)
}
