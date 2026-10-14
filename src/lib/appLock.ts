// The code lock as the app sees it: whether it is on, whether it is locked now,
// and the few things that change that. The logic is in `pinLock.ts`; the
// storage in `pinLockStore.ts`. Read synchronously at start so that the lock
// is up before the first thing is drawn.

import { useSyncExternalStore } from 'react'
import {
  changePin,
  createLock,
  DEFAULT_LOCK_DELAY_MIN,
  shouldLock,
  tryPin,
  waitLeft,
  withDelay,
  withHiddenAt,
  type LockDelayMin,
  type PinLock,
} from './pinLock.ts'
import { clearLock, loadLock, saveLock } from './pinLockStore.ts'

export interface LockSnapshot {
  /** A code has been set. */
  enabled: boolean
  /** The app is asking for it now. */
  locked: boolean
  delayMinutes: LockDelayMin
}

let lock: PinLock | null = loadLock()
let locked = lock !== null && shouldLock(lock, Date.now())
let snapshot = build()
const listeners = new Set<() => void>()

function build(): LockSnapshot {
  return { enabled: lock !== null, locked, delayMinutes: lock?.delayMinutes ?? DEFAULT_LOCK_DELAY_MIN }
}

function publish(): void {
  snapshot = build()
  for (const l of listeners) l()
}

function keep(next: PinLock): boolean {
  lock = next
  return saveLock(next)
}

export function subscribeLock(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export const getLockSnapshot = (): LockSnapshot => snapshot

export function useLockState(): LockSnapshot {
  return useSyncExternalStore(subscribeLock, getLockSnapshot, getLockSnapshot)
}

/** Milliseconds before a code is accepted again (after too many wrong ones); 0 when one can be tried. */
export function lockWaitMs(now = Date.now()): number {
  return lock ? waitLeft(lock, now) : 0
}

export type UnlockResult = { ok: true } | { ok: false; waitMs: number }

/** Tries a code; the app opens when it is the right one. */
export async function unlock(pin: string): Promise<UnlockResult> {
  if (!lock) return { ok: true }
  const out = await tryPin(lock, pin, Date.now())
  keep(out.lock)
  if (out.ok) {
    locked = false
    publish()
    return { ok: true }
  }
  return { ok: false, waitMs: out.waitMs }
}

/** Locks now, whatever the delay ("Verrouiller maintenant"). */
export function lockNow(): void {
  if (!lock) return
  locked = true
  publish()
}

/** Sets the code. The app stays open: the person has just chosen it. False if it could not be kept. */
export async function enableLock(pin: string, delayMinutes: LockDelayMin = DEFAULT_LOCK_DELAY_MIN): Promise<boolean> {
  const saved = keep(await createLock(pin, delayMinutes))
  if (!saved) lock = null
  locked = false
  publish()
  return saved
}

/** Takes the code away. */
export function disableLock(): void {
  lock = null
  locked = false
  clearLock()
  publish()
}

/** A new code, with the current one. False when it is refused. */
export async function changeLockPin(current: string, next: string): Promise<boolean> {
  if (!lock) return false
  const changed = await changePin(lock, current, next, Date.now())
  if (!changed) return false
  keep(changed)
  publish()
  return true
}

export function setLockDelay(delayMinutes: LockDelayMin): void {
  if (!lock) return
  keep(withDelay(lock, delayMinutes))
  publish()
}

// When the app goes out of sight it is covered at once (the system takes its
// picture of the app at that moment, for the app switcher), and the moment is
// kept; when it comes back, the delay decides. Done on the DOM directly, not
// through React, so that the cover is up before the picture is taken.
const COVERED = 'covered'

function onHidden(): void {
  if (!lock) return
  document.documentElement.dataset[COVERED] = '1'
  keep(withHiddenAt(lock, Date.now()))
}

function onVisible(): void {
  delete document.documentElement.dataset[COVERED]
  if (lock && !locked && shouldLock(lock, Date.now())) {
    locked = true
    publish()
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? onHidden() : onVisible()))
  window.addEventListener('pagehide', onHidden)
  window.addEventListener('pageshow', onVisible)
}
