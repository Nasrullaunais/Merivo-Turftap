import { MAX_PAGE_SIZE } from "@turftap/contract";
import { listResourcesOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

/** Every venue's resources in one call, so each venue card can list what it offers. */
export function useAllResources() {
  return useQuery({
    ...listResourcesOptions({ query: { size: MAX_PAGE_SIZE, sort: "name,asc" } }),
    select: (reply) => reply.data.content,
  });
}
