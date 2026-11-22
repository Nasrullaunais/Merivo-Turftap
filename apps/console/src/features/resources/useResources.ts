import { useQuery } from "@tanstack/react-query";
import { listResourcesOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

export function useResources(venueId: number) {
  return useQuery({
    ...listResourcesOptions({ query: { venueId, size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
