// The luminous look: a lighter background, colour on the section icons and a
// pill on the pain weather. It is the look of the app; a switch in Settings
// brings back the earlier one (the "classic" look). A per-device choice, kept in
// `localStorage` so that it is known before anything is drawn (the lock screen
// comes first). Only the choice to go back is stored, so a new device starts
// with the luminous look. The `data-look` stamp on the page root is what the
// stylesheet reads.

import { useSyncExternalStore } from 'react'

const KEY = 'ouch:look'
const CLASSIC = 'classic'
const EVENT = 'ouch:look-changed'

export function isLuminous(): boolean {
  try {
    return localStorage.getItem(KEY) !== CLASSIC
  } catch {
    return true
  }
}

export function setLuminous(on: boolean): void {
  try {
    if (on) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, CLASSIC)
  } catch {
    // The choice cannot be kept: the switch will not move.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** The stamp the stylesheet reads, put on the page root. Done as soon as this file is loaded and at each change, not in a React effect, so the lock screen (drawn before the rest of the app) already has the look. */
function stamp(): void {
  if (isLuminous()) document.documentElement.dataset.look = 'luminous'
  else delete document.documentElement.dataset.look
}
stamp()
for (const name of [EVENT, 'storage']) window.addEventListener(name, stamp)

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useLuminous(): boolean {
  return useSyncExternalStore(subscribe, isLuminous, () => true)
}
