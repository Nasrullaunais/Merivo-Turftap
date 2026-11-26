import { useQuery } from "@tanstack/react-query";
import { listBookingsOptions } from "@turftap/contract/client/react-query";

/** BKG-02: the customer's own booking that is still waiting for payment, so they can open it. */
export function useWaitingBooking(enabled: boolean) {
  return useQuery({
    ...listBookingsOptions({ query: { status: "AWAITING_PAYMENT" } }),
    enabled,
    select: (reply) => reply.data.content[0] ?? null,
  });
}
