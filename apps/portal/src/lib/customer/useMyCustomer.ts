import { useQuery } from "@tanstack/react-query";
import { listCustomersOptions } from "@turftap/contract/client/react-query";

/** POR-03: the signed-in customer's record at this tenant, or null before they gave their name. */
export function useMyCustomer({ enabled }: { enabled: boolean }) {
  return useQuery({
    ...listCustomersOptions(),
    select: (reply) => reply.data.content[0] ?? null,
    enabled,
  });
}
