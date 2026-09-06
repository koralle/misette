import { honoLogger } from "@logtape/hono";
import { configure, getConsoleSink } from "@logtape/logtape";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createAuth } from "./auth.ts";

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

app.get("/", (c) => c.text("Hello Hono!"));

export default app;
