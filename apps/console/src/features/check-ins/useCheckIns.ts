import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import type { Money } from "@turftap/contract/client";
import {
  createCheckInMutation,
  createPaymentMutation,
  deleteCheckInMutation,
  listCheckInsOptions,
  listCheckInsQueryKey,
  listCustomersOptions,
  listMembershipsOptions,
  listMembershipsQueryKey,
  listVenuesOptions,
} from "@turftap/contract/client/react-query";
import { useEffect, useState } from "react";

// Fewer letters than this match too many customers to be worth listing.
const MIN_SEARCH_LENGTH = 3;
const MAX_MATCHES = 6;
const TYPING_PAUSE_MS = 180;

/** The value once typing has paused, so each key press doesn't ask the API. */
function useSettled(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

/** Open venues the caller works at; the desk checks people in at one of them. */
/** VEN-08: only venues with a gym check members in. */
export function useDeskVenues() {
  return useQuery({
    ...listVenuesOptions({ query: { active: "true", size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content.filter((venue) => venue.hasGym),
  });
}

/** D-23: customers whose phone or name holds what was typed ("077 123" finds +94771234567). */
export function useCustomerSearch(typed: string) {
  const search = useSettled(typed.trim());
  const isLongEnough = search.length >= MIN_SEARCH_LENGTH;
  const query = useQuery({
    ...listCustomersOptions({ query: { search, size: MAX_MATCHES } }),
    enabled: isLongEnough,
    placeholderData: keepPreviousData,
    select: (reply) => reply.data.content,
  });
  return {
    customers: isLongEnough && typed.trim().length >= MIN_SEARCH_LENGTH ? query.data : undefined,
    isSearching: typed.trim() !== search || query.isFetching,
  };
}

export function useCustomerMemberships(customerId: number | undefined, venueId: number) {
  return useQuery({
    ...listMembershipsOptions({
      query: { customerId: customerId ?? 0, venueId, size: MAX_PAGE_SIZE },
    }),
    enabled: customerId !== undefined,
    select: (reply) => reply.data.content,
  });
}

/** MEM-05: who came in at the venue today, newest first. */
export function useTodaysCheckIns(venueId: number, today: string) {
  return useQuery({
    ...listCheckInsOptions({ query: { venueId, on: today, size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/** The card shows why a check-in was refused, such as one a day already used. */
export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createCheckInMutation(),
    meta: { silent: true },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listCheckInsQueryKey() }),
  });
}

export function useUndoCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    ...deleteCheckInMutation(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listCheckInsQueryKey() }),
  });
}

/** PAY-08: cash for a membership's Balance, so the customer can come in. */
export function useTakeCash(membershipId: number, onDone: () => void) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    ...createPaymentMutation(),
    meta: { silent: true },
    onSuccess: onDone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: listMembershipsQueryKey() }),
  });
  return {
    ...mutation,
    take: (amount: Money) =>
      mutation.mutate({ body: { kind: "CASH", membershipId, amount, note: null } }),
  };
}
