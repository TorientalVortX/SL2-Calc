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
      includeAssets: ['icon.svg', 'maskable-icon.svg', 'social-preview.svg'],
      manifest: {
        name: 'SL2 Calculator Suite',
        short_name: 'SL2 Calc',
        description: 'Offline character, weapon, armor, and stat calculator for Sigrogana Legend 2.',
        theme_color: '#0f172a',
        background_color: '#020617',
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
  css: {
    postcss: './postcss.config.js',
  },
})
