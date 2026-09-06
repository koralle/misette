import path from "node:path";

import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;
const styledSystem = path.join(root, "styled-system");

export default defineConfig({
  resolve: {
    alias: {
      "styled-system": styledSystem,
    },
  },
  test: {
    projects: [
      {
        test: {
          env: {
            VITE_BETTER_AUTH_URL: "http://127.0.0.1:5173",
          },
          environment: "node",
          include: ["src/**/*.node.test.ts"],
          name: "node",
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "styled-system": styledSystem,
          },
        },
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright(),
          },
          include: ["src/**/*.browser.test.tsx"],
          name: "browser",
        },
      },
    ],
  },
});
