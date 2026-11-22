import { Hono } from "hono";
import { z } from "zod";

import { httpErrors } from "../errors";
import type { AppEnv } from "../http/env";
import { ok } from "../http/envelope";
import { describeSingleton } from "./openapi";
import type { Resource, SingletonDefinition } from "./types";

/** One GET at /v1/<name> about the signed-in caller themselves, so it needs no id and no tenant. */
export function defineSingleton<Item extends z.ZodType>(def: SingletonDefinition<Item>): Resource {
  const routes = new Hono<AppEnv>().get("/", async (c) => {
    const caller = c.get("caller");
    if (caller.actor === "public") throw httpErrors.notSignedIn();
    return ok(c, z.encode(def.schemas.item, await def.service.get(caller)));
  });
  return { name: def.name, routes, openapi: () => describeSingleton(def) };
}
