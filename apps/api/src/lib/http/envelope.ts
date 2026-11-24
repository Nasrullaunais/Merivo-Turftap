import type { ErrorReply } from "@turftap/contract";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { type AppError, Conflict } from "../errors";

export const SUCCESS_MESSAGE = "success";

export const ok = (c: Context, data: unknown, status: ContentfulStatusCode = 200) =>
  c.json({ status, message: SUCCESS_MESSAGE, data }, status);

export const errorReply = (error: AppError, traceId: string): ErrorReply => ({
  status: error.status,
  code: error.code,
  message: error.message,
  traceId,
  ...(error.fieldErrors?.length && { errors: error.fieldErrors }),
  ...(error instanceof Conflict && error.clashingDates && { clashingDates: error.clashingDates }),
});
