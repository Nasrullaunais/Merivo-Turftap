import type { MiddlewareHandler } from "hono";

import { logger } from "../logger";
import { runWithRequestContext } from "../request-context";

const REQUEST_ID_HEADER = "X-Request-Id";
const MAX_INCOMING_ID_LENGTH = 100;

export const requestContext: MiddlewareHandler = (c, next) => {
  const incoming = c.req.header(REQUEST_ID_HEADER);
  const requestId =
    incoming && incoming.length <= MAX_INCOMING_ID_LENGTH ? incoming : crypto.randomUUID();
  return runWithRequestContext({ requestId }, async () => {
    const started = performance.now();
    c.header(REQUEST_ID_HEADER, requestId);
    await next();
    logger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Math.round(performance.now() - started),
      },
      "request",
    );
  });
};
