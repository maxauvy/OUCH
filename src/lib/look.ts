// The look of the app. Two of them:
// - "meteo", the default: the pain weather is the heart of the design (the
//   day's sky, the weather's colours, rounder titles).
// - "leger", the lighter one: plain background, warm plum accent, nothing that
//   is not needed. Chosen in Settings.
// A per-device choice, kept in `localStorage` so that it is known before
// anything is drawn (the lock screen comes first). Only the lighter look is
// stored, so a new device starts with the default. The `data-look` stamp on the
// page root is what the stylesheet reads.

import { useSyncExternalStore } from 'react'
import { LIGHT_LOOK_VALUE, parseLook, type Look } from './lookChoice'

export type { Look } from './lookChoice'

const KEY = 'ouch:look'
const EVENT = 'ouch:look-changed'

export function getLook(): Look {
  try {
    return parseLook(localStorage.getItem(KEY))
  } catch {
    return 'meteo'
  }
}

export function setLook(look: Look): void {
  try {
    if (look === 'meteo') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, LIGHT_LOOK_VALUE)
  } catch {
    // The choice cannot be kept: the control will not move.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** The stamp the stylesheet reads, put on the page root. Done as soon as this file is loaded and at each change, not in a React effect, so the lock screen (drawn before the rest of the app) already has the look. */
function stamp(): void {
  document.documentElement.dataset.look = getLook()
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

export function useLook(): Look {
  return useSyncExternalStore(subscribe, getLook, () => 'meteo')
}

/** The default look, with its colours and decorations (coloured section icons, the weather pill, keys that light up). The lighter look leaves them out. */
export function useRichLook(): boolean {
  return useLook() === 'meteo'
}
