import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// With registerType 'autoUpdate', this reloads the page as soon as a new service
// worker takes over, so an installed PWA shows a new release on the very next
// launch instead of one launch later.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
