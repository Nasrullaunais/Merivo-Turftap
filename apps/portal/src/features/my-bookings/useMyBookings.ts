import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import {
  listBookingsInfiniteOptions,
  listBookingsOptions,
  listMembershipsOptions,
} from "@turftap/contract/client/react-query";

const PAST_PAGE_SIZE = 20;

/** Bookings that haven't ended by `now`, soonest first. One customer never has a full page of them. */
export function useUpcomingBookings(now: string) {
  return useQuery({
    ...listBookingsOptions({ query: { from: now, sort: "startsAt,asc", size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
    meta: { silent: true },
  });
}

/** Bookings that started before `now`, latest first, a page at a time. */
export function usePastBookings(now: string, enabled: boolean) {
  return useInfiniteQuery({
    ...listBookingsInfiniteOptions({
      query: { to: now, sort: "startsAt,desc", size: PAST_PAGE_SIZE },
    }),
    initialPageParam: 0,
    getNextPageParam: ({ data }) => (data.page + 1 < data.totalPages ? data.page + 1 : undefined),
    // One still being played is upcoming, so it shows only there.
    select: (reply) =>
      reply.pages
        .flatMap((page) => page.data.content)
        .filter((booking) => Date.parse(booking.endsAt) <= Date.parse(now)),
    enabled,
    meta: { silent: true },
  });
}

export function useMyMemberships() {
  return useQuery({
    ...listMembershipsOptions({ query: { sort: "startsOn,desc", size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
    meta: { silent: true },
  });
}
