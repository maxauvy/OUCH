import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Content-Security-Policy, as a <meta> because GitHub Pages sets no headers.
// Everything is same-origin except the Open-Meteo calls. `data:` and `blob:`
// are for the weather card and report images (html-to-image), which are
// built in the page and re-read with fetch(). Inline styles are React
// `style` attributes. `frame-ancestors` cannot be set from a <meta>.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob: https://api.open-meteo.com https://archive-api.open-meteo.com https://geocoding-api.open-meteo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/OUCH/' : '/'

  return {
    base,
    plugins: [
      // Build only: the dev server injects inline scripts for hot reload.
      {
        name: 'content-security-policy',
        apply: 'build',
        transformIndexHtml: () => [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
            injectTo: 'head-prepend',
          },
        ],
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Registered by hand in main.tsx, without the plugin's reload on update.
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: base,
          name: 'OUCH — Journal de douleur',
          short_name: 'OUCH',
          description:
            "Un journal quotidien simple pour suivre la douleur, comprendre ce qui l'influence et partager sa météo du jour avec ses proches.",
          theme_color: '#7c6fa8',
          background_color: '#faf8f5',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          lang: 'fr',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // A new release takes over as soon as it is installed; the open page
          // is left alone (see main.tsx).
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],
  }
})
