// PKCE (RFC 7636), for linking a provider from a page that has no server and
// so no secret: the page proves it is the one that started the link with a
// random verifier, sent only after the person has agreed.

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** A random string of `bytes` bytes, in the URL-safe alphabet. */
export function randomToken(bytes = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** The S256 challenge of a verifier: SHA-256, base64url without padding. */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier) as BufferSource)
  return base64Url(new Uint8Array(digest))
}
