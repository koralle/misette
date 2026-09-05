import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    "packages/db/drizzle/**",
    "packages/db/src/schema/auth.ts",
  ],
});
