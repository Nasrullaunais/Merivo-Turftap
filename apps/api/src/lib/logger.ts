import pino from "pino";

import { config } from "./config";
import { currentRequestId } from "./request-context";

/** JSON logs. Every line written during a request or job carries its `requestId`. */
export const logger = pino({
  level: config.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
  mixin: () => {
    const requestId = currentRequestId();
    return requestId ? { requestId } : {};
  },
});
