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
                globPatterns: ['**/*.{js,css,html,svg,woff2}'],
                cleanupOutdatedCaches: true
            }
        })
    ],
    build: { target: 'es2022', sourcemap: true }
});
