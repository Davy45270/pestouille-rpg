import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';

export default defineConfig({
    base: './',
    build: { chunkSizeWarningLimit: 2000 },
    plugins: [VitePWA({
        strategies: 'generateSW', registerType: 'autoUpdate', manifest,
        workbox: { cacheId: 'pestouille-rpg', clientsClaim: true, cleanupOutdatedCaches: true, maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, globPatterns: ['**/*.{html,js,css,png,json,webmanifest}'] }
    })]
});
