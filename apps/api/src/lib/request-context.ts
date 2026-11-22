import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = { requestId: string };

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(context: RequestContext, fn: () => T): T =>
  storage.run(context, fn);

export const currentRequestId = (): string | undefined => storage.getStore()?.requestId;
