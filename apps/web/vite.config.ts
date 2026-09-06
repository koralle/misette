import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react(),
    cloudflare({
      auxiliaryWorkers: [{ configPath: "../workers/wrangler.jsonc" }],
      configPath: "./wrangler.jsonc",
    }),
    VitePWA({
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        background_color: "#ffffff",
        description: "Cooking recipes and kitchen knowledge",
        display: "standalone",
        icons: [
          {
            sizes: "192x192",
            src: "pwa-192x192.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "512x512",
            src: "pwa-512x512.png",
            type: "image/png",
          },
        ],
        lang: "ja",
        name: "Misette",
        short_name: "Misette",
        start_url: "/",
        theme_color: "#111111",
      },
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "styled-system": path.join(root, "styled-system"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
