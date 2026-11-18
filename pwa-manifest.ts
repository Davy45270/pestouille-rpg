import type { ManifestOptions } from 'vite-plugin-pwa';
export const manifest: Partial<ManifestOptions> = {
    name: 'Pestouille RPG — La première flamme', short_name: 'Pestouille RPG', lang: 'fr', display: 'standalone', orientation: 'any',
    theme_color: '#ed4d4c', background_color: '#f6efdf', start_url: './', scope: './',
    icons: [
        { src: 'icons/pestouille-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/pestouille-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ]
};
