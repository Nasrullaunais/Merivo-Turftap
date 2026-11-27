import { useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import {
  getMembershipPlanOptions,
  listMembershipPlansOptions,
  listMembershipsOptions,
} from "@turftap/contract/client/react-query";

/** MEM-01: the plans a venue has on sale; customers never see ones turned off. */
export function usePlans(venueId: number, enabled: boolean) {
  return useQuery({
    ...listMembershipPlansOptions({ query: { venueId, sort: "name,asc", size: MAX_PAGE_SIZE } }),
    enabled,
    select: (reply) => reply.data.content,
  });
}

/** A plan that is gone or turned off is shown on the page, not as a toast. */
export function usePlan(planId: number) {
  return useQuery({
    ...getMembershipPlanOptions({ path: { id: planId } }),
    select: (reply) => reply.data,
    meta: { silent: true },
  });
}

/** The customer's own memberships of one plan, to tell a renewal from a first purchase. */
export function useMyMembershipsOf(planId: number) {
  return useQuery({
    ...listMembershipsOptions({ query: { planId, size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
