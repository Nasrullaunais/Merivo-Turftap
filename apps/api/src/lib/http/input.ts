import type { Context } from "hono";
import type { z } from "zod";

import { httpErrors } from "../errors";

export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw httpErrors.invalidRequest(
    result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
  );
}

export async function jsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw httpErrors.invalidJson();
  }
}

export async function formBody(c: Context): Promise<unknown> {
  try {
    return await c.req.parseBody();
  } catch {
    throw httpErrors.invalidForm();
  }
}
