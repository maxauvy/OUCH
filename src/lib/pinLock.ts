// The code lock, without the screen or the storage: how a code is kept, checked
// and delayed after failures, and when the app locks again. It is a lock on the
// display, not encryption: the journal stays readable in the browser's storage,
// and the code only keeps it from eyes looking at an unlocked device. So the
// code is short (4 digits, quick to type when it hurts), and nothing here ever
// erases anything after a failure.

export const PIN_LENGTH = 4

/** How long the app may stay out of sight before it asks for the code again (minutes); 0 is "right away". */
export const LOCK_DELAYS_MIN = [0, 1, 5, 15] as const
export type LockDelayMin = (typeof LOCK_DELAYS_MIN)[number]
export const DEFAULT_LOCK_DELAY_MIN: LockDelayMin = 1

/** Wrong codes in a row before the app makes the person wait. */
export const FREE_FAILURES = 5
/** The first wait (ms); it doubles with each further failure, up to the ceiling. */
export const FIRST_WAIT_MS = 30_000
export const MAX_WAIT_MS = 15 * 60_000

/** Light on purpose: nothing here resists an attacker who can read the stored hash (they can read the journal itself). */
const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16

/** What the device keeps. The code itself is never kept, only a salted hash of it. */
export interface PinLock {
  salt: string
  hash: string
  iterations: number
  delayMinutes: LockDelayMin
  /** Wrong codes in a row since the last good one. */
  failures: number
  /** Until when codes are refused (ms), once the free failures are used up. */
  lockedUntil?: number
  /** When the app last went out of sight (ms); the delay counts from there. */
  lastHiddenAt?: number
}

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length === PIN_LENGTH
}

export function isLockDelay(v: unknown): v is LockDelayMin {
  return (LOCK_DELAYS_MIN as readonly unknown[]).includes(v)
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

async function hashPin(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, base, 256)
  return toBase64(new Uint8Array(bits))
}

/** Same length, compared in full whatever differs. */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** A new lock for `pin`, with a fresh salt. Throws if `pin` is not `PIN_LENGTH` digits. */
export async function createLock(pin: string, delayMinutes: LockDelayMin = DEFAULT_LOCK_DELAY_MIN): Promise<PinLock> {
  if (!isValidPin(pin)) throw new Error('invalid code')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  return {
    salt: toBase64(salt),
    hash: await hashPin(pin, salt, PBKDF2_ITERATIONS),
    iterations: PBKDF2_ITERATIONS,
    delayMinutes,
    failures: 0,
  }
}

/** How long to wait after `failures` wrong codes in a row (ms); 0 while some are still free. */
export function waitAfter(failures: number): number {
  if (failures < FREE_FAILURES) return 0
  return Math.min(FIRST_WAIT_MS * 2 ** (failures - FREE_FAILURES), MAX_WAIT_MS)
}

/** Milliseconds left before a code is accepted again; 0 when one can be tried. */
export function waitLeft(lock: PinLock, now: number): number {
  return lock.lockedUntil !== undefined && lock.lockedUntil > now ? lock.lockedUntil - now : 0
}

export type TryResult = { ok: true; lock: PinLock } | { ok: false; lock: PinLock; waitMs: number }

/**
 * Checks a code. While a wait is running the code is not even looked at (the
 * right one is refused too, and nothing is counted), so the wait cannot be
 * shortened by trying. A wrong code adds a failure and, from the fifth, a wait.
 */
export async function tryPin(lock: PinLock, pin: string, now: number): Promise<TryResult> {
  const left = waitLeft(lock, now)
  if (left > 0) return { ok: false, lock, waitMs: left }
  const matches = isValidPin(pin) && sameHash(await hashPin(pin, fromBase64(lock.salt), lock.iterations), lock.hash)
  if (matches) return { ok: true, lock: { ...lock, failures: 0, lockedUntil: undefined } }
  const failures = lock.failures + 1
  const wait = waitAfter(failures)
  const next: PinLock = { ...lock, failures, lockedUntil: wait > 0 ? now + wait : undefined }
  return { ok: false, lock: next, waitMs: wait }
}

/** A new code, only when the current one is given (and not waiting). Null when it is refused. */
export async function changePin(lock: PinLock, current: string, next: string, now: number): Promise<PinLock | null> {
  if (!isValidPin(next)) return null
  const checked = await tryPin(lock, current, now)
  if (!checked.ok) return null
  return { ...(await createLock(next, lock.delayMinutes)), lastHiddenAt: lock.lastHiddenAt }
}

export function withDelay(lock: PinLock, delayMinutes: LockDelayMin): PinLock {
  return { ...lock, delayMinutes }
}

export function withHiddenAt(lock: PinLock, at: number): PinLock {
  return { ...lock, lastHiddenAt: at }
}

/**
 * Whether the app asks for the code when it comes into sight at `now`. Yes when
 * it was never seen leaving (a fresh start), when the delay is "right away",
 * when the delay has passed, and when the clock went back (the safe side).
 */
export function shouldLock(lock: PinLock, now: number): boolean {
  if (lock.lastHiddenAt === undefined) return true
  if (lock.delayMinutes === 0) return true
  const away = now - lock.lastHiddenAt
  return away < 0 || away >= lock.delayMinutes * 60_000
}

/** What was kept, if it still has the shape of a lock: anything else is "no lock", never a crash. */
export function parseLock(raw: unknown): PinLock | null {
  if (typeof raw !== 'object' || raw === null) return null
  const v = raw as Record<string, unknown>
  const base64 = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(x)
  if (!base64(v.salt) || !base64(v.hash)) return null
  if (typeof v.iterations !== 'number' || !Number.isInteger(v.iterations) || v.iterations < 1_000 || v.iterations > 2_000_000) return null
  if (!isLockDelay(v.delayMinutes)) return null
  if (typeof v.failures !== 'number' || !Number.isInteger(v.failures) || v.failures < 0) return null
  const time = (x: unknown) => x === undefined || (typeof x === 'number' && Number.isFinite(x))
  if (!time(v.lockedUntil) || !time(v.lastHiddenAt)) return null
  const lock: PinLock = { salt: v.salt, hash: v.hash, iterations: v.iterations, delayMinutes: v.delayMinutes, failures: v.failures }
  if (v.lockedUntil !== undefined) lock.lockedUntil = v.lockedUntil as number
  if (v.lastHiddenAt !== undefined) lock.lastHiddenAt = v.lastHiddenAt as number
  return lock
}
