import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_PAGE_SIZE, PhoneInput } from "@turftap/contract";
import type { Resource } from "@turftap/contract/client";
import {
  createBookingMutation,
  listAvailabilityQueryKey,
  listAvailabilityOptions,
  listBookingsQueryKey,
  listCustomersOptions,
} from "@turftap/contract/client/react-query";

const MS_PER_MINUTE = 60_000;

/**
 * BKG-04: how many back-to-back slots are free from `startsAt`, and the quote for `slots`
 * of them. The server prices the whole length, so the shown price is the one charged.
 */
export function useSlotsFrom(resource: Resource, startsAt: string, date: string, slots: number) {
  const query = (count: number) => ({
    resourceId: resource.id,
    date,
    slots: count,
    size: MAX_PAGE_SIZE,
  });
  const single = useQuery(listAvailabilityOptions({ query: query(1) }));
  const quote = useQuery({
    ...listAvailabilityOptions({ query: query(slots) }),
    placeholderData: keepPreviousData,
    select: (reply) => reply.data.content.find((slot) => slot.startsAt === startsAt),
  });

  const free = new Set(
    single.data?.data.content.filter((slot) => slot.free).map((slot) => slot.startsAt),
  );
  let freeInARow = 0;
  const slotMs = resource.slotMinutes * MS_PER_MINUTE;
  while (free.has(new Date(Date.parse(startsAt) + freeInARow * slotMs).toISOString())) freeInARow++;

  return { isPending: single.isPending, freeInARow, quote: quote.data };
}

/** The customer with this phone number, once it is a whole number. */
export function useCustomerByPhone(phone: string) {
  const parsed = PhoneInput.safeParse(phone);
  return useQuery({
    ...listCustomersOptions({ query: { phone: parsed.data ?? "" } }),
    enabled: parsed.success,
    select: (reply) => reply.data.content[0],
  });
}

/**
 * The form shows why a booking was refused, such as the slot being just taken. After booking,
 * the free slots are only marked stale: refetched now, they'd flip the closing form to "taken".
 */
export function useBookWalkIn(resourceId: number, date: string, onBooked: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    ...createBookingMutation(),
    meta: { silent: true },
    onSuccess: () => {
      onBooked();
      void queryClient.invalidateQueries({
        queryKey: listAvailabilityQueryKey({ query: { resourceId, date } }),
        refetchType: "none",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listBookingsQueryKey() }),
  });
}
