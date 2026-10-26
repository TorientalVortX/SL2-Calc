import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import gameData from './src/data/game-data.json'
import packageJson from './package.json'

const cacheNamespace = `sl2-${packageJson.version}-${gameData.dataVersion}`

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'maskable-icon.svg'],
      manifest: {
        name: 'Aether Codex',
        short_name: 'Aether Codex',
        description: 'Offline character builder for Sigrogana Legend 2.',
        theme_color: '#05070b',
        background_color: '#04060a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/maskable-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: cacheNamespace,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,json,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: `${cacheNamespace}-pages`, networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  /*
   * `three` reaches the graph only through the intro's dynamic import, so the dev
   * server would otherwise discover it late: the first cold load triggers a
   * re-optimize and a full reload part-way through booting the intro. Naming it
   * here pre-bundles it at startup instead.
   *
   * A precaution rather than a fix for an observed bug — production is unaffected
   * either way, since `vite build` emits a real chunk and runs no optimizer.
   */
  optimizeDeps: {
    include: ['three'],
  },
})
