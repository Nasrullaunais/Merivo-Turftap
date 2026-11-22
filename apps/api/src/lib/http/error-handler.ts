import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { translateDbError } from "../db/translate";
import { AppError, httpErrors } from "../errors";
import { logger } from "../logger";
import { currentRequestId } from "../request-context";
import { errorReply } from "./envelope";

const SERVER_ERROR = 500;

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const fromDb = translateDbError(error);
  if (fromDb) return fromDb;
  if (error instanceof HTTPException && error.status < SERVER_ERROR) {
    return new AppError(error.status, `tt_htt_${error.status}`, error.message);
  }
  return httpErrors.internal();
}

export const onError: ErrorHandler = (error, c) => {
  const appError = toAppError(error);
  if (appError.status >= SERVER_ERROR) logger.error({ err: error }, "request failed");
  const reply = errorReply(appError, currentRequestId() ?? "unknown");
  return c.json(reply, appError.status as ContentfulStatusCode);
};

export const onNotFound: NotFoundHandler = (c) => onError(httpErrors.routeNotFound(c.req.path), c);
