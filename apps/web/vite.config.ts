import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'styled-system': path.join(root, 'styled-system'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    cloudflare({
      configPath: './wrangler.jsonc',
      auxiliaryWorkers: [{ configPath: '../workers/wrangler.jsonc' }],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Misette',
        short_name: 'Misette',
        description: 'Cooking recipes and kitchen knowledge',
        theme_color: '#111111',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'ja',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
});
