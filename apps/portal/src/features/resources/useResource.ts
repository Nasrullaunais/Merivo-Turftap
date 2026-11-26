import { getResourceOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

/** Waits while `resourceId` is still unknown. A missing or turned-off one is shown on the page. */
export function useResource(resourceId: number | undefined) {
  return useQuery({
    ...getResourceOptions({ path: { id: resourceId! } }),
    enabled: resourceId !== undefined,
    select: (reply) => reply.data,
    meta: { silent: true },
  });
}
