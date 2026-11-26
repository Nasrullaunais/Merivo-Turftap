import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ListMembershipsResponse,
  type Membership,
  updateMembership,
} from "@turftap/contract/client";
import {
  getMembershipQueryKey,
  listMembershipsQueryKey,
} from "@turftap/contract/client/react-query";

import { withViewTransition } from "../../lib/motion/viewTransition";

const swapIn = (reply: ListMembershipsResponse, changed: Membership): ListMembershipsResponse => ({
  ...reply,
  data: {
    ...reply.data,
    content: reply.data.content.map((membership) =>
      membership.id === changed.id ? changed : membership,
    ),
  },
});

/** MEM-02: cancels a membership still waiting for payment; its card glides to the end of the list. */
export function useCancelMembership(membershipId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await updateMembership({
        path: { id: membershipId },
        body: { status: "CANCELLED" },
      });
      return data.data;
    },
    onSuccess: (cancelled) => {
      withViewTransition("cancel", () => {
        queryClient.setQueriesData<ListMembershipsResponse>(
          { queryKey: listMembershipsQueryKey() },
          (reply) => reply && swapIn(reply, cancelled),
        );
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listMembershipsQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getMembershipQueryKey({ path: { id: membershipId } }),
      });
    },
  });
}
