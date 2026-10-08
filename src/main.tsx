import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
// Imported here so the browser's one-time install prompt is not missed
// before a screen that offers it is on show.
import './hooks/useInstall'

// A new release installs in the background and takes over straight away
// (skipWaiting + clientsClaim in vite.config.ts), but the page is not
// reloaded: a reload a second after launch flashes the screen and
// wipes whatever was being typed. The running page keeps its code (it is one
// bundle, nothing loaded later), and the new release shows from the next
// launch or reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
