import { z } from "zod";

import type { AnyDefinition, Operation } from "./types";
type JsonSchema = Record<string, unknown>;

const ref = (schema: z.ZodType, what: string) => {
  const id = z.globalRegistry.get(schema)?.id;
  if (!id) throw new Error(`Give the ${what} schema an id: .meta({ id: "..." })`);
  return { $ref: `#/components/schemas/${id}` };
};

const pascal = (kebab: string) =>
  kebab.replace(/(^|-)([a-z])/g, (_match, _dash, letter: string) => letter.toUpperCase());

const json = (schema: JsonSchema) => ({ "application/json": { schema } });

const envelope = (data: JsonSchema) => ({
  type: "object",
  required: ["status", "message", "data"],
  properties: { status: { type: "integer" }, message: { type: "string" }, data },
});

const pageOf = (item: JsonSchema) => ({
  type: "object",
  required: ["content", "page", "size", "totalElements", "totalPages"],
  properties: {
    content: { type: "array", items: item },
    page: { type: "integer" },
    size: { type: "integer" },
    totalElements: { type: "integer" },
    totalPages: { type: "integer" },
  },
});

const reply = (description: string, data: JsonSchema) => ({
  description,
  content: json(envelope(data)),
});

const ERRORS = {
  default: {
    description: "Error",
    content: json({ $ref: "#/components/schemas/ErrorReply" }),
  },
};

const idParameter = { name: "id", in: "path", required: true, schema: { type: "integer" } };

function listParameters(def: AnyDefinition) {
  const sortChoices = (def.sort?.fields ?? []).flatMap((field) => [
    `${field},asc`,
    `${field},desc`,
  ]);
  const filters = def.schemas.filters
    ? (z.toJSONSchema(def.schemas.filters, { io: "input" }).properties ?? {})
    : {};
  return [
    { name: "page", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
    {
      name: "size",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
    {
      name: "sort",
      in: "query",
      schema: { type: "string", enum: sortChoices, default: def.sort?.default },
    },
    ...Object.entries(filters).map(([name, schema]) => ({ name, in: "query", schema })),
  ];
}

export function describeResource(def: AnyDefinition) {
  const item = ref(def.schemas.item, `${def.name} item`);
  const singular = z.globalRegistry.get(def.schemas.item)?.id ?? pascal(def.name);
  const plural = pascal(def.name);
  const security = (op: Operation) =>
    def.public?.includes(op) ? [{}, { bearerAuth: [] }] : [{ bearerAuth: [] }];
  const operation = (op: Operation, operationId: string, rest: object) => ({
    tags: [def.name],
    operationId,
    security: security(op),
    ...rest,
  });

  const collection: Record<string, unknown> = {};
  const single: Record<string, unknown> = {};
  const has = (op: Operation) => def.operations.includes(op);

  if (has("list")) {
    collection.get = operation("list", `list${plural}`, {
      parameters: listParameters(def),
      responses: { 200: reply("One page", pageOf(item)), ...ERRORS },
    });
  }
  if (has("create") && def.schemas.create) {
    collection.post = operation("create", `create${singular}`, {
      requestBody: { required: true, content: json(ref(def.schemas.create, `${def.name} create`)) },
      responses: { 201: reply("Created", item), ...ERRORS },
    });
  }
  if (has("get")) {
    single.get = operation("get", `get${singular}`, {
      parameters: [idParameter],
      responses: { 200: reply("Found", item), ...ERRORS },
    });
  }
  if (has("update") && def.schemas.update) {
    single.patch = operation("update", `update${singular}`, {
      parameters: [idParameter],
      requestBody: { required: true, content: json(ref(def.schemas.update, `${def.name} update`)) },
      responses: { 200: reply("Changed", item), ...ERRORS },
    });
  }
  if (has("delete")) {
    single.delete = operation("delete", `delete${singular}`, {
      parameters: [idParameter],
      responses: { 200: reply("Deleted", { type: "null" }), ...ERRORS },
    });
  }

  return {
    ...(Object.keys(collection).length && { [`/v1/${def.name}`]: collection }),
    ...(Object.keys(single).length && { [`/v1/${def.name}/{id}`]: single }),
  };
}

/** Every schema with an id, written as OpenAPI components. */
export function componentSchemas(): Record<string, JsonSchema> {
  const { schemas } = z.toJSONSchema(z.globalRegistry, {
    io: "input",
    uri: (id) => `#/components/schemas/${id}`,
  });
  return Object.fromEntries(
    Object.entries(schemas).map(([id, { $id: _id, $schema: _schema, ...schema }]) => [id, schema]),
  );
}
