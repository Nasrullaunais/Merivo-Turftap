import { useQuery } from "@tanstack/react-query";
import { getBookingOptions } from "@turftap/contract/client/react-query";

/** One of the customer's own bookings. Someone else's is not found, which the page shows. */
export function useBooking(bookingId: number) {
  return useQuery({
    ...getBookingOptions({ path: { id: bookingId } }),
    select: (reply) => reply.data,
    meta: { silent: true },
  });
}
