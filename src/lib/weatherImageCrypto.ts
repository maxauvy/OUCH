// The day's weather image for a relative is encrypted before it goes to
// Dropbox, so Dropbox (or anyone with the bare Dropbox link) only sees an
// unreadable file. The key is a random 256-bit AES-GCM key, made when the
// person turns the sharing on, kept on the device, and given to the relative
// inside OUCH Duo's address, after the `#` (see duoLink.ts): it never reaches
// a server.
//
// File: "OWI1" (4 bytes) + IV (12 bytes) + AES-GCM ciphertext of the PNG.
// The 4 bytes are also the additional data, so a file of another kind or
// version is refused. Used by OUCH (encrypt) and Duo (decrypt); tested in
// tests/weatherImageCrypto.test.ts.

const MAGIC = new TextEncoder().encode('OWI1')
const IV_BYTES = 12
const KEY_BYTES = 32

export class WeatherImageKeyError extends Error {
  constructor(message = 'the image could not be opened with this key') {
    super(message)
    this.name = 'WeatherImageKeyError'
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** A 256-bit key written in base64url: 43 characters. */
export function isWeatherImageKey(text: string | null | undefined): text is string {
  return typeof text === 'string' && /^[A-Za-z0-9_-]{43}$/.test(text)
}

/** A new random key, in the form carried by the Duo address. */
export function newWeatherImageKey(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(KEY_BYTES)))
}

function importKey(key: string, use: KeyUsage): Promise<CryptoKey> {
  if (!isWeatherImageKey(key)) throw new WeatherImageKeyError('not a key')
  return crypto.subtle.importKey('raw', fromBase64Url(key), 'AES-GCM', false, [use])
}

/** The image, encrypted with `key`, as the bytes to upload. */
export async function encryptWeatherImage(png: Blob, key: string): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: MAGIC },
    await importKey(key, 'encrypt'),
    await png.arrayBuffer(),
  )
  return new Blob([MAGIC, iv, sealed], { type: 'application/octet-stream' })
}

/** The PNG back from the uploaded bytes; throws `WeatherImageKeyError` for a wrong key or a file that is not one of these. */
export async function decryptWeatherImage(file: ArrayBuffer, key: string): Promise<Blob> {
  const bytes = new Uint8Array(file)
  if (bytes.length <= MAGIC.length + IV_BYTES || MAGIC.some((b, i) => bytes[i] !== b)) throw new WeatherImageKeyError('not an encrypted weather image')
  const iv = bytes.slice(MAGIC.length, MAGIC.length + IV_BYTES)
  try {
    const png = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: MAGIC },
      await importKey(key, 'decrypt'),
      bytes.slice(MAGIC.length + IV_BYTES),
    )
    return new Blob([png], { type: 'image/png' })
  } catch (e) {
    throw e instanceof WeatherImageKeyError ? e : new WeatherImageKeyError()
  }
}
