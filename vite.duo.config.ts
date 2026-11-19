import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// OUCH Duo: the small app a relative installs to see someone's weather of the
// day. Built on its own, after OUCH (`npm run build`), into dist/duo, so
// OUCH's single bundle and its service worker are untouched. Duo has its own
// manifest and service worker (duo/public), scoped to /OUCH/duo/.
//
// Dev: `npm run dev:duo` serves it at http://localhost:5174/duo/; OUCH in dev
// points its code and link there (see lib/duoBase.ts).

// What Duo may load: its own files, and the encrypted image from Dropbox's
// content host (read with fetch(), then shown from a blob: URL once opened).
// The camera stream for the code scanner is a MediaStream, not a fetched URL.
const policy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://dl.dropboxusercontent.com https://*.dl.dropboxusercontent.com",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('./duo', import.meta.url)),
  base: command === 'build' ? '/OUCH/duo/' : '/duo/',
  server: { port: 5174, strictPort: true, host: true },
  build: {
    outDir: fileURLToPath(new URL('./dist/duo', import.meta.url)),
    emptyOutDir: true,
  },
  plugins: [
    // Build only: the dev server injects inline scripts for hot reload.
    {
      name: 'content-security-policy',
      apply: 'build',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
      ],
    },
    react(),
  ],
}))
