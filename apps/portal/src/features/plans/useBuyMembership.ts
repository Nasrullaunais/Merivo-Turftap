import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMembershipMutation,
  listMembershipsQueryKey,
} from "@turftap/contract/client/react-query";

/** MEM-02, MEM-04: buys or renews. A refusal shows as a toast, and the customer's memberships reload. */
export function useBuyMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createMembershipMutation(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listMembershipsQueryKey() }),
  });
}
