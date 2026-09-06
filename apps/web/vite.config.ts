import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
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
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});
