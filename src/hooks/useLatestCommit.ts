import { useEffect, useState } from 'react'

/** Commit of the release currently deployed, read from version.json, or
 * null while unknown (dev server, offline, file missing). Checked at launch
 * and each time the page comes back to the foreground, which is when an
 * installed PWA is most likely to be a release behind. */
export function useLatestCommit(): string | null {
  const [latest, setLatest] = useState<string | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    let cancelled = false

    async function check() {
      try {
        // no-store: skip the HTTP cache, which GitHub Pages lets keep files for minutes.
        const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
        if (!res.ok) return
        const data: unknown = await res.json()
        const commit = (data as { commit?: unknown }).commit
        if (!cancelled && typeof commit === 'string') setLatest(commit)
      } catch {
        // Offline or blocked: say nothing rather than a false alarm.
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') void check()
    }

    void check()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return latest
}

/** Reload onto the newest release. The service worker may still hold the old
 * one, so ask it to update and wait for it to take over before reloading. */
export async function reloadToLatest(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) {
    await reg.update().catch(() => {})
    if (reg.installing || reg.waiting) {
      // skipWaiting + clientsClaim: the new worker takes control once installed.
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        setTimeout(resolve, 5000)
      })
    }
  }
  window.location.reload()
}
