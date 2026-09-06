import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, tanstack, antiSlop, vitest],
  ignorePatterns: [
    ...core.ignorePatterns,
    "packages/db/drizzle/**",
    "packages/db/src/schema/auth.ts",
    "styled-system/**",
    "**/styled-system/**",
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
  ],
  overrides: [
    // Work around https://github.com/haydenbleasel/ultracite/issues/789.
    {
      files: ["apps/web/src/routes/**/*.{ts,tsx}"],
      rules: {
        "no-use-before-define": "off",
      },
    },
    {
      files: ["packages/db/src/schema/**/*.ts"],
      rules: {
        "import/no-cycle": "off",
        "sort-keys": "off",
      },
    },
    {
      files: ["packages/db/src/schema/index.ts"],
      rules: {
        "oxc/no-barrel-file": "off",
      },
    },
  ],
});
