import { useSyncExternalStore } from 'react'
import { installKind, type InstallKind } from '../lib/installKind'

// The browser fires `beforeinstallprompt` once, early, and may do so before
// any screen that offers the install is on show: it is kept here from the
// start (this module is imported by main.tsx) and handed over when asked.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

const standaloneQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null

if (typeof window !== 'undefined') {
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
}

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

/** How this browser can install OUCH, or 'installed' when it already is. */
export function useInstallKind(): InstallKind {
  return useSyncExternalStore(subscribe, current, () => 'other')
}

/** Shows the browser's own install prompt; only from a tap. */
export async function promptInstall(): Promise<void> {
  const event = deferred
  if (!event) return
  await event.prompt()
  await event.userChoice
  // A prompt can be shown once: the browser gives a new one if it comes back.
  deferred = null
  notify()
}
