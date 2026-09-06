import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const baseURL = `http://127.0.0.1:${String(port)}`;
const ci = process.env["CI"];
const isCi = ci !== undefined && ci !== "";

export default defineConfig({
  forbidOnly: isCi,
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  retries: isCi ? 2 : 0,
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${String(port)}`,
    reuseExistingServer: !isCi,
    timeout: 120_000,
    url: baseURL,
  },
});
