// Linking Dropbox: the address the person is sent to, and the two calls that
// turn what comes back into tokens. Nothing here stores anything or touches
// the page (`dropboxLink.ts` does), so it runs under test with a fake `fetch`.
//
// The app key is public (PKCE needs no secret). The app is registered with
// "App folder" access: OUCH sees one folder of its own, never the rest of a
// person's Dropbox.

import { challengeFor } from './pkce.ts'

export const DROPBOX_APP_KEY = 'qp1qouacsjriq3r'

const AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize'
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'

export interface DropboxTokens {
  accessToken: string
  refreshToken: string
  /** When the access token stops working (ms). */
  expiresAt: number
}

/** Where Dropbox sends the person back to: the app's own address. Registered in the app's settings. */
export function redirectUri(origin: string, basePath: string): string {
  return `${origin}${basePath}`
}

/** `offline` asks for a refresh token, so copies can go out for months without a new sign-in. */
export async function authorizeUrl(args: { verifier: string; state: string; redirect: string }): Promise<string> {
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    code_challenge: await challengeFor(args.verifier),
    code_challenge_method: 'S256',
    redirect_uri: args.redirect,
    state: args.state,
    token_access_type: 'offline',
  })
  return `${AUTHORIZE_URL}?${params}`
}

type Fetch = typeof fetch

async function tokenRequest(body: Record<string, string>, fetchFn: Fetch): Promise<Response> {
  return fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
}

export class DropboxAuthError extends Error {
  /** `revoked`: the link was withdrawn (by the person at Dropbox, or expired): it has to be made again. */
  readonly kind: 'revoked' | 'network' | 'other'
  constructor(kind: 'revoked' | 'network' | 'other') {
    super(kind)
    this.name = 'DropboxAuthError'
    this.kind = kind
  }
}

async function readTokens(res: Response, now: number, previousRefresh?: string): Promise<DropboxTokens> {
  let json: { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; error?: unknown }
  try {
    json = await res.json()
  } catch {
    throw new DropboxAuthError('other')
  }
  if (!res.ok) throw new DropboxAuthError(json.error === 'invalid_grant' ? 'revoked' : 'other')
  const refresh = typeof json.refresh_token === 'string' ? json.refresh_token : previousRefresh
  if (typeof json.access_token !== 'string' || !refresh || typeof json.expires_in !== 'number') {
    throw new DropboxAuthError('other')
  }
  return { accessToken: json.access_token, refreshToken: refresh, expiresAt: now + json.expires_in * 1000 }
}

/** Trades the code Dropbox sent back for tokens, proving with the verifier that this page asked for it. */
export async function exchangeCode(
  args: { code: string; verifier: string; redirect: string },
  fetchFn: Fetch = fetch,
  now = Date.now()
): Promise<DropboxTokens> {
  let res: Response
  try {
    res = await tokenRequest(
      {
        grant_type: 'authorization_code',
        code: args.code,
        client_id: DROPBOX_APP_KEY,
        redirect_uri: args.redirect,
        code_verifier: args.verifier,
      },
      fetchFn
    )
  } catch {
    throw new DropboxAuthError('network')
  }
  return readTokens(res, now)
}

/** A new access token from the refresh token (which stays the same). */
export async function refreshTokens(refreshToken: string, fetchFn: Fetch = fetch, now = Date.now()): Promise<DropboxTokens> {
  let res: Response
  try {
    res = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: DROPBOX_APP_KEY }, fetchFn)
  } catch {
    throw new DropboxAuthError('network')
  }
  return readTokens(res, now, refreshToken)
}
