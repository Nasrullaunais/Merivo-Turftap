import { toast } from "@heroui/react";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "./ApiError";

type ErrorMeta = Record<string, unknown> & {
  /** The page shows this error itself, so don't toast it. */
  silent?: boolean;
};

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
    queryMeta: ErrorMeta;
    mutationMeta: ErrorMeta;
  }
}

const MAX_RETRIES = 2;
const STALE_TIME_MS = 30_000;
const UNAUTHORIZED = 401;

const isClientError = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;

/** The one place failed requests are shown. 401s are left to the sign-in code. */
export function toastError(error: unknown, meta?: ErrorMeta): void {
  if (meta?.silent || !(error instanceof ApiError) || error.status === UNAUTHORIZED) return;
  toast.danger(error.message, { description: error.traceId && `Reference: ${error.traceId}` });
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => toastError(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => toastError(error, mutation.meta),
    }),
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        // A 4xx fails the same way every time; only network and server errors are retried.
        retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
      },
    },
  });
}
