import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type Plugin } from 'vite'
import { execSync } from 'node:child_process'

// Short commit of the build, so the footer tells which release a browser runs.
function commitSha(): string {
  const fromCi = process.env.GITHUB_SHA
  if (fromCi) return fromCi.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

// Tiny file next to the app that says which release is deployed. The running
// page compares it with its own commit (see useLatestCommit). Not precached
// (globPatterns has no json), so the service worker never serves a stale copy.
function versionFile(commit: string, date: string): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ commit, date }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/OUCH/' : '/'

  const commit = command === 'build' ? commitSha() : 'dev'
  const date = new Date().toISOString().slice(0, 10)

  return {
    base,
    define: {
      __APP_COMMIT__: JSON.stringify(commit),
      __APP_BUILD_DATE__: JSON.stringify(date),
    },
    plugins: [
      versionFile(commit, date),
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
