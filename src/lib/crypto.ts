// Password-based encryption for backup/sync files, entirely client-side
// (WebCrypto). Nothing here ever leaves the device unless the user shares
// the file themselves.

// OWASP-recommended floor for PBKDF2-HMAC-SHA256 as of 2023. Backups made
// before this was raised recorded their own (lower) count in `iterations`,
// so old files stay decryptable — never bump this without keeping that field.
const PBKDF2_ITERATIONS = 600_000
// Iteration count used by backups from before `iterations` was stored in the payload.
const LEGACY_PBKDF2_ITERATIONS = 250_000
const SALT_BYTES = 16
const IV_BYTES = 12
const MAGIC = 'OUCH1'

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export interface EncryptedPayload {
  magic: string
  salt: string
  iv: string
  ciphertext: string
  createdAt: string
  /** PBKDF2 iteration count used to derive the key. Absent on files written
   * before this field existed — those used `LEGACY_PBKDF2_ITERATIONS`. */
  iterations?: number
}

export async function encryptJSON(data: unknown, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext)
  return {
    magic: MAGIC,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
    iterations: PBKDF2_ITERATIONS,
  }
}

export async function decryptJSON<T = unknown>(payload: EncryptedPayload, password: string): Promise<T> {
  if (payload.magic !== MAGIC) throw new Error('Fichier de sauvegarde non reconnu.')
  const salt = fromBase64(payload.salt)
  const iv = fromBase64(payload.iv)
  const key = await deriveKey(password, salt, payload.iterations ?? LEGACY_PBKDF2_ITERATIONS)
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      fromBase64(payload.ciphertext) as BufferSource
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as T
  } catch {
    throw new Error('Mot de passe incorrect, ou fichier corrompu.')
  }
}
