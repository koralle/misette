import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { createAuth } from './auth.ts';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use('/api/auth/*', (c, next) =>
  cors({
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
    origin: c.env.WEB_ORIGIN,
  })(c, next),
);

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw));

app.get('/', (c) => c.text('Hello Hono!'));

export default app;
