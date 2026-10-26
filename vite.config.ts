import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        // Stable chunks so a release only re-downloads what changed. skills-text stays lazy; app-release changes every release.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'game-data', test: /src[\\/]data[\\/](armors\.json|content[\\/](?!skills-text\.json)[^\\/]+\.json)$/ },
            // Shared with the lazy intro scene; on its own so app releases don't rehash the three.js chunk.
            { name: 'crest', test: /src[\\/]aether[\\/]intro[\\/]crest\.ts$/ },
          ],
        },
      },
    },
  },
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
        // Kept stable across releases so unchanged hashed assets are reused instead of re-downloaded.
        cacheId: 'sl2',
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,json,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'sl2-pages', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  // `three` is only reached via a dynamic import; pre-bundle it so a cold dev load
  // does not re-optimize and full-reload part-way through the intro.
  optimizeDeps: {
    include: ['three'],
  },
})
