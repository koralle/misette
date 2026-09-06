import { honoLogger } from "@logtape/hono";
import { configure, getConsoleSink } from "@logtape/logtape";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createAuth } from "./auth.ts";
import { createDb } from "./db.ts";
import { rpcHandler } from "./rpc.ts";

await configure({
  loggers: [
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
    { category: ["hono"], lowestLevel: "info", sinks: ["console"] },
  ],
  sinks: {
    console: getConsoleSink(),
  },
});

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(honoLogger());

app.use("/api/auth/*", async (c, next) => {
  const authCors = cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    maxAge: 600,
    origin: c.env.WEB_ORIGIN,
  });

  // Hono's CORS helper erases the app context generics at this boundary.
  // oxlint-disable-next-line typescript/no-unsafe-argument
  return await authCors(c, next);
});

app.on(
  ["GET", "POST"],
  "/api/auth/*",
  async (c) => await createAuth(c.env).handler(c.req.raw)
);

app.use("/api/rpc/*", async (c) => {
  if (!c.env.DB) {
    throw new Error("D1 database binding DB not configured");
  }
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  const result = await rpcHandler.handle(c.req.raw, {
    context: {
      db: createDb(c.env.DB),
      session,
    },
    prefix: "/api/rpc",
  });

  if (result.matched) {
    return result.response;
  }
  return await c.notFound();
});

app.get("/", (c) => c.text("Hello Hono!"));

export default app;
