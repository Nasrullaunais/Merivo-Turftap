import { useQuery } from "@tanstack/react-query";
import { listVenuesOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

export function useVenues() {
  return useQuery({
    ...listVenuesOptions({ query: { size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
