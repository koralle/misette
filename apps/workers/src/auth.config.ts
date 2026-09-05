import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { authOptions } from "./auth-options.ts";

/**
 * CLI-only Better Auth instance. `auth generate` loads this file and does not
 * connect to D1. Runtime requests must use `createAuth` in `auth.ts`.
 */
export const auth = betterAuth({
  ...authOptions,
  database: drizzleAdapter(
    {},
    {
      provider: "sqlite",
    }
  ),
});
