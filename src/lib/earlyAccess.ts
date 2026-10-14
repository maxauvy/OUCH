// Early access: features not yet offered to everyone, which a person (or the
// developer, on a phone) can switch on for this device. It is a per-device
// choice, kept in `localStorage`: switched on by the tap gesture (see
// `earlyAccessTaps.ts`) or, once, by `?autobackup` at the end of the address
// (`?autobackup=0` switches it off). Always on in development.

import { useSyncExternalStore } from 'react'

const KEY = 'ouch:early-access'
/** What `?autobackup` set before the switch was general: still honoured. */
const LEGACY_KEY = 'ouch:autobackup'
const EVENT = 'ouch:early-access-changed'

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1' || localStorage.getItem(LEGACY_KEY) === '1'
  } catch {
    return false
  }
}

export function isEarlyAccess(): boolean {
  return import.meta.env.DEV || stored()
}

export function setEarlyAccess(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else {
      localStorage.removeItem(KEY)
      localStorage.removeItem(LEGACY_KEY)
    }
  } catch {
    // The choice cannot be kept: the page will say nothing changed.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** `?autobackup` at the end of the address, taken once at start and removed from it. */
function applyAddressParam(): void {
  try {
    const params = new URLSearchParams(location.search)
    if (!params.has('autobackup')) return
    setEarlyAccess(params.get('autobackup') !== '0')
    params.delete('autobackup')
    const rest = params.toString()
    history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`)
  } catch {
    // An address that cannot be read is left as it is.
  }
}
applyAddressParam()

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useEarlyAccess(): boolean {
  return useSyncExternalStore(subscribe, isEarlyAccess, () => false)
}
