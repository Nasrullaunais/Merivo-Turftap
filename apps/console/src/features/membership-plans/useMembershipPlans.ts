import { useQuery } from "@tanstack/react-query";
import {
  listMembershipPlansOptions,
  listVenuesOptions,
} from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

/** Every plan the caller may see, on sale or turned off. The API leaves out venues they don't work at. */
export function useMembershipPlans() {
  return useQuery({
    ...listMembershipPlansOptions({ query: { size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/** The open venues, each heading its own plans. */
export function usePlanVenues() {
  return useQuery({
    ...listVenuesOptions({ query: { active: "true", size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
