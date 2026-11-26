import { getResourceOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

/** A missing or turned-off resource is shown on the page, not as a toast. */
export function useResource(resourceId: number) {
  return useQuery({
    ...getResourceOptions({ path: { id: resourceId } }),
    select: (reply) => reply.data,
    meta: { silent: true },
  });
}
