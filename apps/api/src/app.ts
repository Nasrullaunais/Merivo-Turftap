import { ErrorReply } from "@turftap/contract";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { config } from "./lib/config";
import { db } from "./lib/db";
import type { AppEnv } from "./lib/http/env";
import { ok } from "./lib/http/envelope";
import { onError, onNotFound } from "./lib/http/error-handler";
import { requestContext } from "./lib/http/request-context";
import { resolveCaller } from "./modules/platform/platform.service";
import { RESOURCES } from "./resources";

// Registers ErrorReply in the schema list, so OpenAPI includes it even before any route uses it.
void ErrorReply;

export function createApp() {
  const app = new Hono<AppEnv>();
  app.use(requestContext);
  app.use(
    "/v1/*",
    cors({
      origin: config.corsOrigins,
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "X-Tenant-Id",
        "X-Tenant-Slug",
        "X-Request-Id",
      ],
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      exposeHeaders: ["X-Request-Id"],
    }),
  );
  app.use("/v1/*", async (c, next) => {
    const caller = await resolveCaller({
      authorization: c.req.header("Authorization"),
      tenantId: c.req.header("X-Tenant-Id"),
      tenantSlug: c.req.header("X-Tenant-Slug"),
    });
    c.set("caller", caller);
    await next();
  });

  for (const resource of RESOURCES) app.route(`/v1/${resource.name}`, resource.routes);

  app.get("/health", (c) => ok(c, { process: "up" }));
  app.get("/health/ready", async (c) => {
    await db().execute(sql`select 1`);
    return ok(c, { database: "up" });
  });

  app.onError(onError);
  app.notFound(onNotFound);
  return app;
}
