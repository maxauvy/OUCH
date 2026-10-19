// The "luminous" look: a lighter background, colour on the section icons and a
// pill on the pain weather. A per-device try-out, offered in Settings only in
// early access (see `earlyAccess.ts`), kept in `localStorage` like it. The
// `data-look` stamp on the page root is what the stylesheet reads.

import { useSyncExternalStore } from 'react'
import { isEarlyAccess } from './earlyAccess'

const KEY = 'ouch:look-luminous'
const EVENT = 'ouch:look-changed'

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** On only while early access is on: switching early access off brings the usual look back. */
export function isLuminous(): boolean {
  return isEarlyAccess() && stored()
}

export function setLuminous(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // The choice cannot be kept: the switch will not move.
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('ouch:early-access-changed', onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('ouch:early-access-changed', onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useLuminous(): boolean {
  return useSyncExternalStore(subscribe, isLuminous, () => false)
}
