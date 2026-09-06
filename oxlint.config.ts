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
  ],
  overrides: [
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
