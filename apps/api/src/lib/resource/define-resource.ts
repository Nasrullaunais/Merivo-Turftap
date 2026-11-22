import { DEFAULT_PAGE_SIZE, Id, MAX_PAGE_SIZE } from "@turftap/contract";
import { type Context, Hono } from "hono";
import { z } from "zod";

import type { AuthContext, Caller } from "../auth/context";
import { type Action, isStaffResource, ROLE_PERMISSIONS } from "../auth/permissions";
import { httpErrors } from "../errors";
import type { AppEnv } from "../http/env";
import { ok } from "../http/envelope";
import { describeResource } from "./openapi";
import type { AnyDefinition, Handlers, Operation, Resource, ResourceDefinition } from "./types";

const ACTION_OF: Record<Operation, Action> = {
  list: "read",
  get: "read",
  create: "create",
  update: "update",
  delete: "delete",
};

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw httpErrors.invalidRequest(
    result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
  );
}

async function jsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw httpErrors.invalidJson();
  }
}

function authorize(
  name: string,
  op: Operation,
  isPublic: boolean,
  forCustomers: boolean,
  caller: Caller,
): AuthContext {
  if (!isPublic && caller.actor === "public") throw httpErrors.notSignedIn();
  if (caller.tenantId === undefined) throw httpErrors.tenantMissing();
  if (isPublic) return { ...caller, tenantId: caller.tenantId };

  switch (caller.actor) {
    case "platform_admin":
      break;
    case "staff": {
      const allowed =
        isStaffResource(name) &&
        caller.role &&
        ROLE_PERMISSIONS[caller.role].has(`${name}:${ACTION_OF[op]}`);
      if (!allowed) throw httpErrors.notAllowed();
      break;
    }
    case "customer":
    case "assistant":
      if (!forCustomers) throw httpErrors.notAllowed();
      break;
    default:
      throw httpErrors.notAllowed();
  }
  return { ...caller, tenantId: caller.tenantId };
}

function checkDefinition(def: AnyDefinition) {
  const problem = (text: string) => new Error(`Resource ${def.name}: ${text}`);
  const service = def.service as Partial<Record<string, unknown>>;
  for (const op of def.operations) {
    const handler = op === "delete" ? "remove" : op;
    if (typeof service[handler] !== "function") throw problem(`service has no ${handler}()`);
  }
  if (def.operations.includes("create") && !def.schemas.create)
    throw problem("needs a create schema");
  if (def.operations.includes("update") && !def.schemas.update)
    throw problem("needs an update schema");
  if (def.operations.includes("list") && !def.sort) throw problem("needs sort fields");
  const reserved = ["page", "size", "sort"].filter(
    (key) => key in (def.schemas.filters?.shape ?? {}),
  );
  if (reserved.length) throw problem(`filters may not be called ${reserved.join(", ")}`);
}

/**
 * Declares up to five routes under /v1/<name>. Each checks access and input, calls one service
 * function and wraps the reply; the same declaration produces the OpenAPI description.
 */
export function defineResource<
  const Op extends Operation,
  Item extends z.ZodType,
  Create extends z.ZodType = z.ZodNever,
  Update extends z.ZodType = z.ZodNever,
  Filters extends z.ZodObject = z.ZodObject<{}>,
  const SortField extends string = never,
>(definition: ResourceDefinition<Op, Item, Create, Update, Filters, SortField>): Resource {
  const def = definition as unknown as AnyDefinition;
  checkDefinition(def);
  const service = def.service as Handlers<unknown, unknown, unknown, unknown, string>;
  const { item } = def.schemas;
  const has = (op: Operation) => def.operations.includes(op);
  const access = (c: Context<AppEnv>, op: Operation) =>
    authorize(
      def.name,
      op,
      !!def.public?.includes(op),
      !!def.forCustomers?.includes(op),
      c.get("caller"),
    );
  const encode = (value: unknown) => z.encode(item, value);
  const idOf = (c: Context) => parse(z.coerce.number().pipe(Id), c.req.param("id"));

  const listQuery = z
    .strictObject({
      page: z.coerce.number().int().min(0).default(0),
      size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
      sort: z.string().default(def.sort?.default ?? "id,asc"),
      ...def.schemas.filters?.shape,
    })
    .superRefine((query, ctx) => {
      const [field, direction] = query.sort.split(",");
      if (!def.sort?.fields.includes(field ?? "") || !["asc", "desc"].includes(direction ?? "")) {
        const choices = def.sort?.fields.join(", ");
        ctx.addIssue({
          code: "custom",
          path: ["sort"],
          message: `Must be <field>,asc|desc with a field from: ${choices}`,
        });
      }
    });

  const routes = new Hono<AppEnv>();

  if (has("list")) {
    routes.get("/", async (c) => {
      const auth = access(c, "list");
      const { page, size, sort, ...filters } = parse(listQuery, c.req.query());
      const [field, direction] = sort.split(",") as [string, "asc" | "desc"];
      const result = await service.list(auth, {
        filters,
        page: { page, size, sort: { field, direction } },
      });
      return ok(c, { ...result, content: result.content.map(encode) });
    });
  }
  if (has("get")) {
    routes.get("/:id", async (c) => ok(c, encode(await service.get(access(c, "get"), idOf(c)))));
  }
  if (has("create") && def.schemas.create) {
    const schema = def.schemas.create;
    routes.post("/", async (c) => {
      const auth = access(c, "create");
      const input = parse(schema, await jsonBody(c));
      return ok(c, encode(await service.create(auth, input)), 201);
    });
  }
  if (has("update") && def.schemas.update) {
    const schema = def.schemas.update;
    routes.patch("/:id", async (c) => {
      const auth = access(c, "update");
      const id = idOf(c);
      const input = parse(schema, await jsonBody(c));
      return ok(c, encode(await service.update(auth, id, input)));
    });
  }
  if (has("delete")) {
    routes.delete("/:id", async (c) => {
      await service.remove(access(c, "delete"), idOf(c));
      return ok(c, null);
    });
  }

  return { name: def.name, routes, openapi: () => describeResource(def) };
}
