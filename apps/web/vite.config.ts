import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', includeAssets: ['icon.svg'], manifest: { name: 'Shua — Plan, cook, enjoy', short_name: 'Shua', description: 'Personal cooking and meal planning', theme_color: '#315b45', background_color: '#f8f4ec', display: 'standalone', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] }, workbox: { navigateFallback: '/index.html', runtimeCaching: [{ urlPattern: ({ request }) => request.destination === 'document', handler: 'NetworkFirst', options: { cacheName: 'shua-pages' } }] } })],
  resolve: { preserveSymlinks: true }
});
