import { MAX_PAGE_SIZE } from "@turftap/contract";
import { listResourcesOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

export function useResources(venueId: number) {
  return useQuery({
    ...listResourcesOptions({ query: { venueId, size: MAX_PAGE_SIZE, sort: "name,asc" } }),
    select: (reply) => reply.data.content,
  });
}
