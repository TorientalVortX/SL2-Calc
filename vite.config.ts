import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import gameData from './src/data/game-data.json'
import packageJson from './package.json'

const cacheNamespace = `sl2-${packageJson.version}-${gameData.dataVersion}`

const entry = (file: string) => fileURLToPath(new URL(file, import.meta.url))

export default defineConfig({
  server: {
    proxy: {
      '/api/optimizer-ai': 'http://127.0.0.1:8787',
      '/api/optimizer-health': 'http://127.0.0.1:8787',
    },
  },
  build: {
    /*
     * Two front ends over one domain layer. The Aether Codex is the front door at
     * `/`; the original calculator stays reachable at `/classic.html` but is no
     * longer linked to from anywhere. `aether.html` is kept as a redirect so links
     * and bookmarks written while the Codex lived there still arrive.
     */
    rollupOptions: {
      input: {
        main: entry('index.html'),
        classic: entry('classic.html'),
        aether: entry('aether.html'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'maskable-icon.svg', 'social-preview.svg'],
      manifest: {
        name: 'SL2 Calculator Suite',
        short_name: 'SL2 Calc',
        description: 'Offline character, weapon, armor, and stat calculator for Sigrogana Legend 2.',
        // The Codex's palette, since it is what `start_url` now opens.
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
  css: {
    postcss: './postcss.config.js',
  },
})
