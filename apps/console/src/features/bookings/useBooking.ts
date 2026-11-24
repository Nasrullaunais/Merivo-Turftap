import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import type { Booking } from "@turftap/contract/client";
import {
  createPaymentMutation,
  getBookingOptions,
  getBookingQueryKey,
  getRepeatSeriesOptions,
  getRepeatSeriesQueryKey,
  listBookingsQueryKey,
  listPaymentsOptions,
  listPaymentsQueryKey,
  updateBookingMutation,
  updateRepeatSeriesMutation,
} from "@turftap/contract/client/react-query";

/** The booking as it is now. The calendar's copy shows at once while the latest loads. */
export function useBooking(pressed: Booking) {
  return useQuery({
    ...getBookingOptions({ path: { id: pressed.id } }),
    placeholderData: { status: 200, message: "success", data: pressed },
    select: (reply) => reply.data,
  });
}

export function usePayments(bookingId: number) {
  return useQuery({
    ...listPaymentsOptions({ query: { bookingId, sort: "createdAt,asc", size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/** BKG-09: the Repeat Series a booking belongs to, if any. */
export function useSeries(seriesId: number | null) {
  return useQuery({
    ...getRepeatSeriesOptions({ path: { id: seriesId ?? 0 } }),
    enabled: seriesId !== null,
    select: (reply) => reply.data,
  });
}

/** After any change, or a refusal that may mean someone else changed it, show the latest. */
function refetchAfterChange(queryClient: QueryClient, bookingId: number) {
  void queryClient.invalidateQueries({ queryKey: getBookingQueryKey({ path: { id: bookingId } }) });
  void queryClient.invalidateQueries({ queryKey: listPaymentsQueryKey() });
  void queryClient.invalidateQueries({ queryKey: listBookingsQueryKey() });
}

/** The form shows why it was refused, such as "more than the balance". */
export function useRecordPayment(bookingId: number, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...createPaymentMutation(),
    meta: { silent: true },
    onSuccess: onDone,
    onSettled: () => refetchAfterChange(queryClient, bookingId),
  });
}

/** BKG-07: a cancelled booking frees its slots, so the free slots refetch too. */
export function useCancelBooking(bookingId: number, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateBookingMutation(),
    meta: { silent: true },
    onSuccess: onDone,
    onSettled: () => {
      refetchAfterChange(queryClient, bookingId);
      void queryClient.invalidateQueries({ queryKey: [{ _id: "listAvailability" }] });
    },
  });
}

/** BKG-09: cancels every booking in the series that hasn't started, this one included. */
export function useCancelSeries(seriesId: number, bookingId: number, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateRepeatSeriesMutation(),
    meta: { silent: true },
    onSuccess: onDone,
    onSettled: () => {
      refetchAfterChange(queryClient, bookingId);
      void queryClient.invalidateQueries({
        queryKey: getRepeatSeriesQueryKey({ path: { id: seriesId } }),
      });
      void queryClient.invalidateQueries({ queryKey: [{ _id: "listAvailability" }] });
    },
  });
}
