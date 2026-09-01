import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth/minimal';
import { waitUntil } from 'cloudflare:workers';

import { createDb, schema } from '@misette/db';

import { authOptions } from './auth-options.ts';

export function createAuth(env: CloudflareBindings) {
  return betterAuth({
    ...authOptions,
    advanced: {
      ...authOptions.advanced,
      backgroundTasks: {
        handler: waitUntil,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(createDb(env.DB), {
      provider: 'sqlite',
      schema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
  });
}
