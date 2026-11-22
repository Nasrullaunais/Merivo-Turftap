import { listVenuesOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

export function useVenues() {
  return useQuery({
    ...listVenuesOptions({ query: { sort: "name,asc" } }),
    select: (reply) => reply.data.content,
  });
}
