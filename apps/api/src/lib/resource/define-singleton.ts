import { Hono } from "hono";
import { z } from "zod";

import type { Caller } from "../auth/context";
import { httpErrors } from "../errors";
import type { AppEnv } from "../http/env";
import { ok } from "../http/envelope";
import { describeSingleton } from "./openapi";
import type { Resource, SingletonDefinition } from "./types";

function read<Item extends z.ZodType>(def: SingletonDefinition<Item>, caller: Caller) {
  if (def.about === "tenant") {
    if (caller.tenantId === undefined) throw httpErrors.tenantMissing();
    return def.service.get({ ...caller, tenantId: caller.tenantId });
  }
  if (caller.actor === "public") throw httpErrors.notSignedIn();
  return def.service.get(caller);
}

/**
 * One GET at /v1/<name> with no id: about the signed-in caller (`me`, no tenant needed) or about
 * the caller's tenant (`tenant`, open without sign-in).
 */
export function defineSingleton<Item extends z.ZodType>(def: SingletonDefinition<Item>): Resource {
  const routes = new Hono<AppEnv>().get("/", async (c) =>
    ok(c, z.encode(def.schemas.item, await read(def, c.get("caller")))),
  );
  return { name: def.name, routes, openapi: () => describeSingleton(def) };
}
