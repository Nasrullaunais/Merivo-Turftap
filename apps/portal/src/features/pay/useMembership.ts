import { useQuery } from "@tanstack/react-query";
import { getMembershipOptions } from "@turftap/contract/client/react-query";

/** One of the customer's own memberships. Someone else's is not found, which the page shows. */
export function useMembership(membershipId: number) {
  return useQuery({
    ...getMembershipOptions({ path: { id: membershipId } }),
    select: (reply) => reply.data,
    meta: { silent: true },
  });
}
