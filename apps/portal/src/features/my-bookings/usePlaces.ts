import { useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import type { Resource, Venue } from "@turftap/contract/client";
import { listResourcesOptions, listVenuesOptions } from "@turftap/contract/client/react-query";

/** The tenant's venues and resources by id, to name what each booking is for. */
export function usePlaces() {
  const venues = useQuery({
    ...listVenuesOptions({ query: { size: MAX_PAGE_SIZE, sort: "name,asc" } }),
    select: (reply) => new Map<number, Venue>(reply.data.content.map((v) => [v.id, v])),
  });
  const resources = useQuery({
    ...listResourcesOptions({ query: { size: MAX_PAGE_SIZE, sort: "name,asc" } }),
    select: (reply) => new Map<number, Resource>(reply.data.content.map((r) => [r.id, r])),
  });
  return { venues, resources };
}
