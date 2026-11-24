import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import type { AuthContext, Caller } from "../auth/context";
import { httpErrors } from "../errors";
import type { AppEnv } from "../http/env";
import { describeStream } from "./openapi";
import type { Resource, StreamDefinition } from "./types";

// Bun closes a connection that sends nothing for 10 seconds, so a quiet stream says something sooner.
const HEARTBEAT_MS = 8_000;

function staffOnly(caller: Caller): AuthContext {
  if (caller.actor === "public") throw httpErrors.notSignedIn();
  if (caller.actor !== "staff" && caller.actor !== "platform_admin") throw httpErrors.notAllowed();
  if (caller.tenantId === undefined) throw httpErrors.tenantMissing();
  return { ...caller, tenantId: caller.tenantId };
}

/**
 * One GET at /v1/<name> that stays open and pushes each item as a Server-Sent Event, for staff
 * of the chosen tenant. The service decides which items the caller may see.
 */
export function defineStream<Item extends z.ZodType>(def: StreamDefinition<Item>): Resource {
  const routes = new Hono<AppEnv>().get("/", (c) => {
    const auth = staffOnly(c.get("caller"));
    return streamSSE(c, async (stream) => {
      const unsubscribe = def.service.subscribe(auth, (item) => {
        void stream.writeSSE({ data: JSON.stringify(z.encode(def.schemas.item, item)) });
      });
      const closed = new Promise<void>((resolve) => stream.onAbort(resolve));
      stream.onAbort(unsubscribe);
      while (!stream.aborted) {
        await Promise.race([stream.sleep(HEARTBEAT_MS), closed]);
        if (!stream.aborted) await stream.write(": heartbeat\n\n");
      }
    });
  });
  return { name: def.name, routes, openapi: () => describeStream(def) };
}
