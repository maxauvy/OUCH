// OUCH Duo's service worker: keeps the app's own files so it opens without
// network. Network first, so a new release shows at the next opening; the
// copy kept is used only when the network fails. The day's image is not
// handled here: the page keeps the last one itself (src/duo/imageStore.ts).

const CACHE = 'ouch-duo-app-v1'
const SCOPE = new URL(self.registration.scope)

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('ouch-duo-app-') && k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== SCOPE.origin) return
  // Every page of Duo is the same page: kept under the scope's address.
  const key = request.mode === 'navigate' ? SCOPE.href : request
  if (request.mode !== 'navigate' && !url.pathname.startsWith(SCOPE.pathname) && !url.pathname.endsWith('.png') && !url.pathname.endsWith('.svg')) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      try {
        const response = await fetch(request)
        if (response.ok) await cache.put(key, response.clone())
        return response
      } catch (error) {
        const kept = await cache.match(key)
        if (kept) return kept
        throw error
      }
    })(),
  )
})
