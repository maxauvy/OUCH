// The code lock as the app sees it: whether it is on, whether it is locked now,
// and the few things that change that. The logic is in `pinLock.ts`; the
// storage in `pinLockStore.ts`. Read synchronously at start so that the lock
// is up before the first thing is drawn.

import { useSyncExternalStore } from 'react'
import {
  changePin,
  createLock,
  DEFAULT_LOCK_DELAY_MIN,
  lockAtStart,
  reloadPassValid,
  shouldLock,
  tryPin,
  waitLeft,
  withDelay,
  withHiddenAt,
  withLanguage,
  withLocked,
  type LockDelayMin,
  type PinLock,
} from './pinLock.ts'
import { clearLock, loadLock, saveLock } from './pinLockStore.ts'
import type { Language } from '../i18n/language.ts'

interface LockSnapshot {
  /** A code has been set. */
  enabled: boolean
  /** The app is asking for it now. */
  locked: boolean
  delayMinutes: LockDelayMin
  /** The language kept with the lock, for drawing it before the settings are read. */
  language?: Language
}

// Marks the session in which the code was entered. `sessionStorage` is gone
// when the app is closed (by the person or by the system), so a marker that is
// missing means a launch from scratch; if it cannot be read, that is assumed too.
const SESSION_KEY = 'ouch:lock-session'

function sessionSeen(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== null
  } catch {
    return false
  }
}

function markSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Without it, a reload asks for the code again: the safe side.
  }
}

// The pass a reload from "Recharger" leaves (see `lockAtStart`): in localStorage
// and not in sessionStorage, because some systems start a fresh session at a
// reload. It is read and removed at once, and lasts seconds.
const PASS_KEY = 'ouch:lock-reload-pass'

/** Called by the app just before it reloads itself, from an unlocked state. */
export function grantReloadPass(): void {
  if (!lock || locked) return
  try {
    localStorage.setItem(PASS_KEY, String(Date.now()))
  } catch {
    // Without it the reload asks for the code: slower, never less safe.
  }
}

function takeReloadPass(now: number): boolean {
  try {
    const raw = localStorage.getItem(PASS_KEY)
    localStorage.removeItem(PASS_KEY)
    return raw !== null && reloadPassValid(Number(raw), now)
  } catch {
    return false
  }
}

let lock: PinLock | null = loadLock()
let locked = lock !== null && lockAtStart(lock, Date.now(), sessionSeen(), takeReloadPass(Date.now()))
// A lock that is on stays on through a reload, until the code is entered.
if (lock && locked && !lock.locked) saveLock(withLocked(lock, true))
if (lock) lock = { ...lock, locked }
let snapshot = build()
const listeners = new Set<() => void>()

function build(): LockSnapshot {
  return { enabled: lock !== null, locked, delayMinutes: lock?.delayMinutes ?? DEFAULT_LOCK_DELAY_MIN, language: lock?.language }
}

function publish(): void {
  snapshot = build()
  for (const l of listeners) l()
}

function keep(next: PinLock): boolean {
  lock = next
  return saveLock(next)
}

function subscribeLock(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

const getLockSnapshot = (): LockSnapshot => snapshot

export function useLockState(): LockSnapshot {
  return useSyncExternalStore(subscribeLock, getLockSnapshot, getLockSnapshot)
}

/** Milliseconds before a code is accepted again (after too many wrong ones); 0 when one can be tried. */
export function lockWaitMs(now = Date.now()): number {
  return lock ? waitLeft(lock, now) : 0
}

type UnlockResult = { ok: true } | { ok: false; waitMs: number }

/** Tries a code; the app opens when it is the right one. */
export async function unlock(pin: string): Promise<UnlockResult> {
  if (!lock) return { ok: true }
  const out = await tryPin(lock, pin, Date.now())
  keep(out.ok ? withLocked(out.lock, false) : out.lock)
  if (out.ok) {
    locked = false
    markSession()
    publish()
    return { ok: true }
  }
  return { ok: false, waitMs: out.waitMs }
}

/** Checks a code without changing whether the app is locked: to change or remove the code. Wrong codes count like on the lock screen. */
export async function checkLockPin(pin: string): Promise<UnlockResult> {
  if (!lock) return { ok: true }
  const out = await tryPin(lock, pin, Date.now())
  keep(out.lock)
  publish()
  return out.ok ? { ok: true } : { ok: false, waitMs: out.waitMs }
}

/** Locks now, whatever the delay ("Verrouiller maintenant"). */
export function lockNow(): void {
  if (!lock) return
  locked = true
  keep(withLocked(lock, true))
  publish()
}

/** Sets the code. The app stays open: the person has just chosen it. False if it could not be kept. */
export async function enableLock(
  pin: string,
  delayMinutes: LockDelayMin = DEFAULT_LOCK_DELAY_MIN,
  language?: Language
): Promise<boolean> {
  const saved = keep(await createLock(pin, delayMinutes, language))
  if (!saved) lock = null
  locked = false
  markSession()
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

/** Keeps the app's language with the lock, so that the next start draws the lock in it. */
export function syncLockLanguage(language: Language): void {
  if (!lock || lock.language === language) return
  keep(withLanguage(lock, language))
  publish()
}

export function setLockDelay(delayMinutes: LockDelayMin): void {
  if (!lock) return
  keep(withDelay(lock, delayMinutes))
  publish()
}

// When the app goes out of sight it is covered at once, and the moment is kept;
// when it comes back, the delay decides. Done on the DOM directly, not through
// React. The cover is a try, not a promise: on iOS the first signal a page gets
// (measured on iOS 27.0.1, installed web app) arrives when the page is already
// hidden, and a hidden page is no longer redrawn, so the app switcher's picture
// is the last screen shown. Nothing a web page can listen to comes earlier; the
// documents say so.
const COVERED = 'covered'

function cover(): void {
  if (lock) document.documentElement.dataset[COVERED] = '1'
}

function uncover(): void {
  delete document.documentElement.dataset[COVERED]
}

function onHidden(): void {
  if (!lock) return
  cover()
  // Only an unlocked app leaves a time: a locked one going away (or reloading)
  // must not restart the delay, or a reload would open it.
  if (!locked) keep(withHiddenAt(lock, Date.now()))
}

function onVisible(): void {
  uncover()
  if (lock && !locked && shouldLock(lock, Date.now())) {
    locked = true
    keep(withLocked(lock, true))
    publish()
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? onHidden() : onVisible()))
  window.addEventListener('pagehide', onHidden)
  // `pageshow` also fires at every load, where the start-up rule (`lockAtStart`) has already decided: only a page brought back from the back/forward cache is a return.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) onVisible()
  })
}
