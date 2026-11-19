// How Duo can be put on the home screen from here. Same rules as OUCH's
// (lib/installKind.ts); the browser's one-time prompt is kept from the start
// (this module is imported by main.tsx).

import { useSyncExternalStore } from 'react'
import { installKind, type InstallKind } from '../lib/installKind'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const standaloneQuery = window.matchMedia?.('(display-mode: standalone)') ?? null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})
standaloneQuery?.addEventListener?.('change', notify)

const current = (): InstallKind =>
  installKind({
    standalone: !!standaloneQuery?.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    canPrompt: deferred !== null,
  })

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDuoInstall(): InstallKind {
  return useSyncExternalStore(subscribe, current, () => 'other')
}

/** Shows the browser's own install prompt; only from a tap. */
export async function promptInstall(): Promise<void> {
  const event = deferred
  if (!event) return
  await event.prompt()
  await event.userChoice
  deferred = null
  notify()
}
