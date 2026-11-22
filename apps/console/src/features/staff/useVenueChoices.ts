import { useQuery } from "@tanstack/react-query";
import { listVenuesOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

/** The venues staff can be limited to. The API sends only the ones the caller works at. */
export function useVenueChoices() {
  return useQuery({
    ...listVenuesOptions({ query: { size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
