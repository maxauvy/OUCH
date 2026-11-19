import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/bricolage-grotesque'
import './duo.css'
import './install'
import { DuoApp } from './DuoApp'
import { strings } from './strings'

document.documentElement.lang = strings.lang

// Duo's own service worker (duo/public/sw.js), limited to Duo's address, so
// OUCH's never steps in here and Duo's never steps into OUCH.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DuoApp />
  </StrictMode>,
)
