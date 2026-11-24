import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import {
  getBookingOptions,
  getResourceOptions,
  getVenueOptions,
  listBookingsQueryKey,
  listPaymentsOptions,
  listPaymentsQueryKey,
  updatePaymentMutation,
} from "@turftap/contract/client/react-query";

const WAITING = { status: "PENDING_CHECK" } as const;

/** PAY-07: the sidebar badge. Live updates refetch it whenever a payment changes. */
export function useWaitingCount() {
  return useQuery({
    ...listPaymentsOptions({ query: { ...WAITING, size: 1 } }),
    select: (reply) => reply.data.totalElements,
  });
}

/** PAY-07: the receipts waiting for a check, oldest first, so nobody waits long. */
export function useWaitingReceipts() {
  return useQuery({
    ...listPaymentsOptions({
      query: { ...WAITING, sort: "createdAt,asc", size: MAX_PAGE_SIZE },
    }),
    select: (reply) => reply.data.content,
  });
}

/** The booking a receipt pays for. */
export function usePaidBooking(bookingId: number | null) {
  return useQuery({
    ...getBookingOptions({ path: { id: bookingId ?? 0 } }),
    enabled: bookingId !== null,
    select: (reply) => reply.data,
  });
}

/** The booking with its resource and its venue's time zone. */
export function useReceiptBooking(bookingId: number | null) {
  const booking = usePaidBooking(bookingId);
  const resource = useQuery({
    ...getResourceOptions({ path: { id: booking.data?.resourceId ?? 0 } }),
    enabled: booking.data !== undefined,
    select: (reply) => reply.data,
  });
  const venue = useQuery({
    ...getVenueOptions({ path: { id: booking.data?.venueId ?? 0 } }),
    enabled: booking.data !== undefined,
    select: (reply) => reply.data,
  });
  return { booking: booking.data, resource: resource.data, venue: venue.data };
}

/**
 * PAY-04, PAY-05: accept or reject. A refusal shows in the check (someone else checked it
 * meanwhile), and either way the queue and the booking refetch.
 */
export function useCheckReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    ...updatePaymentMutation(),
    meta: { silent: true },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listPaymentsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: listBookingsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: [{ _id: "getBooking" }] });
    },
  });
}
