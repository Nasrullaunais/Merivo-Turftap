import { getTenantOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

/** POR-01: the tenant of this portal address. Its failures are shown as a whole page, not a toast. */
export function useTenant() {
  return useQuery({
    ...getTenantOptions(),
    select: (reply) => reply.data,
    staleTime: Infinity,
    meta: { silent: true },
  });
}
