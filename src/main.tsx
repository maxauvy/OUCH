import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
// Imported here so the browser's one-time install prompt is not missed
// before a screen that offers it is on show.
import './hooks/useInstall'
import { shouldReloadForChunk } from './lib/staleChunk'

// A new release installs in the background and takes over straight away
// (skipWaiting + clientsClaim in vite.config.ts), but the page is not
// reloaded: a reload a second after launch flashes the screen and
// wipes whatever was being typed. The running page keeps its code, and the
// new release shows from the next launch or reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
}

// The screens loaded on first opening (see App.tsx) may be gone from an old
// release still on screen: reload once onto the new one rather than fall on
// the crash page (lib/staleChunk.ts). The short wait lets a pending save of
// the entry form (350 ms) go through first.
window.addEventListener('vite:preloadError', (event) => {
  let store: Storage | undefined
  try {
    store = sessionStorage
  } catch {
    store = undefined
  }
  if (!shouldReloadForChunk(Date.now(), store)) return
  event.preventDefault()
  window.setTimeout(() => window.location.reload(), 500)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
