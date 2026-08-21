import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/latex-gym/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', '.nojekyll'],
      manifest: {
        name: 'LaTeX gym',
        short_name: 'LaTeX gym',
        description: 'Интерактивная академическая среда для изучения LaTeX.',
        theme_color: '#FAFAF8',
        background_color: '#FAFAF8',
        display: 'standalone',
        start_url: '/latex-gym/#/',
        scope: '/latex-gym/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: {
        navigateFallback: 'index.html',
        // Installation should cache the application shell, not eagerly download
        // the full curriculum, editor, KaTeX and font graph. Hashed lazy assets
        // are cached on first use below and remain available on subsequent runs.
        globPatterns: ['index.html','assets/index-*.js','assets/index-*.css','**/*.svg'],
        runtimeCaching: [{
          urlPattern: /\/latex-gym\/assets\/.*\.(?:js|css|woff2?|woff|ttf)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'latex-gym-runtime-assets',
            expiration: {maxEntries: 120,maxAgeSeconds: 60*60*24*30},
            cacheableResponse: {statuses: [0,200]}
          }
        }],
        cleanupOutdatedCaches: true
      }
    })
  ],
  build: { target: 'es2022', sourcemap: true }
});
