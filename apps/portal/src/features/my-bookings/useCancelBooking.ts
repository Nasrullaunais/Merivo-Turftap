import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Booking, type ListBookingsResponse, updateBooking } from "@turftap/contract/client";
import { getBookingQueryKey, listBookingsQueryKey } from "@turftap/contract/client/react-query";

import { withViewTransition } from "../../lib/motion/viewTransition";

const swapIn = (reply: ListBookingsResponse, changed: Booking): ListBookingsResponse => ({
  ...reply,
  data: {
    ...reply.data,
    content: reply.data.content.map((booking) => (booking.id === changed.id ? changed : booking)),
  },
});

// Past bookings load page by page and never hold a booking that can still be cancelled.
const isPaged = (key: readonly unknown[]) => (key[0] as { _infinite?: boolean })._infinite === true;

/** BKG-06: cancels one of the customer's bookings; its card glides to "Cancelled or expired". */
export function useCancelBooking(bookingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await updateBooking({
        path: { id: bookingId },
        body: { status: "CANCELLED" },
      });
      return data.data;
    },
    onSuccess: (cancelled) => {
      withViewTransition("cancel", () => {
        queryClient.setQueriesData<ListBookingsResponse>(
          { queryKey: listBookingsQueryKey(), predicate: (query) => !isPaged(query.queryKey) },
          (reply) => reply && swapIn(reply, cancelled),
        );
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listBookingsQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getBookingQueryKey({ path: { id: bookingId } }),
      });
      void queryClient.invalidateQueries({ queryKey: [{ _id: "listAvailability" }] });
    },
  });
}
