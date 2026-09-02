import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth/minimal';
import { waitUntil } from 'cloudflare:workers';

import * as schema from '@misette/db/schema';

import { authOptions } from './auth-options.ts';
import { createDb } from './db.ts';

export function createAuth(env: CloudflareBindings) {
  if (!env.DB) {
    throw new Error('D1 database binding DB not configured');
  }
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
