import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import {
  createMembershipMutation,
  listMembershipPlansOptions,
  listMembershipsOptions,
  listMembershipsQueryKey,
  listVenuesOptions,
} from "@turftap/contract/client/react-query";

/** The newest memberships the caller may see. The API leaves out venues they don't work at. */
export function useMemberships() {
  return useQuery({
    ...listMembershipsOptions({ query: { sort: "createdAt,desc", size: MAX_PAGE_SIZE } }),
    select: (reply) => ({ memberships: reply.data.content, total: reply.data.totalElements }),
  });
}

/** Every venue the caller works at, open or not: a membership needs its venue's time zone. */
export function useMembershipVenues() {
  return useQuery({
    ...listVenuesOptions({ query: { size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/** Open venues with the plans on sale at each, for the sell form. */
export function usePlansOnSale() {
  const venues = useMembershipVenues();
  const plans = useQuery({
    ...listMembershipPlansOptions({ query: { size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content.filter((plan) => plan.active),
  });
  if (!venues.data || !plans.data) return undefined;
  const onSale = plans.data;
  return venues.data
    .filter((venue) => venue.active)
    .map((venue) => ({ venue, plans: onSale.filter((plan) => plan.venueId === venue.id) }))
    .filter((place) => place.plans.length > 0);
}

/** MEM-04: the last day of this customer's active membership of the plan, if they hold one. */
export function useCurrentLastDay(customerId: number | undefined, planId: number | undefined) {
  return useQuery({
    ...listMembershipsOptions({
      query: { customerId: customerId ?? 0, planId: planId ?? 0, status: "ACTIVE" },
    }),
    enabled: customerId !== undefined && planId !== undefined,
    select: (reply) =>
      reply.data.content
        .map((membership) => membership.endsOn)
        .sort()
        .at(-1),
  });
}

/** MEM-03. The form shows why a sale was refused, such as the customer already holding the plan. */
export function useSellMembership(onSold: (membershipId: number) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...createMembershipMutation(),
    meta: { silent: true },
    onSuccess: (reply) => onSold(reply.data.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listMembershipsQueryKey() }),
  });
}
