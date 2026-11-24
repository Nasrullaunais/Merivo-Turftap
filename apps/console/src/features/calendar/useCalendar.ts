import { useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import { listBlockedTimes, listBookings, type Venue } from "@turftap/contract/client";
import {
  listBlockedTimesQueryKey,
  listBookingsQueryKey,
  listClosedDatesOptions,
  listResourcesOptions,
  listVenuesOptions,
} from "@turftap/contract/client/react-query";
import { instantInZone } from "@turftap/ui";

import { addDays } from "./calendarGrid";

type Page<T> = { content: T[]; totalPages: number };

async function everyPage<T>(fetchPage: (page: number) => Promise<Page<T>>) {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const reply = await fetchPage(page);
    items.push(...reply.content);
    if (page + 1 >= reply.totalPages) return items;
  }
}

export function useCalendarVenues() {
  return useQuery({
    ...listVenuesOptions({ query: { active: "true", size: MAX_PAGE_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/**
 * BKG-05: what one venue has on the dates shown. Bookings use the generated query key,
 * so live updates refetch them when one changes.
 */
export function useCalendar(venue: Venue | undefined, dates: string[]) {
  const venueId = venue?.id ?? 0;
  const [first, last] = [dates[0]!, dates.at(-1)!];
  const range = venue && {
    from: instantInZone(first, "00:00", venue.timeZone).toISOString(),
    to: instantInZone(addDays(last, 1), "00:00", venue.timeZone).toISOString(),
  };

  const resources = useQuery({
    ...listResourcesOptions({ query: { venueId, active: "true", size: MAX_PAGE_SIZE } }),
    enabled: venue !== undefined,
    select: (reply) => reply.data.content,
  });
  const resourceIds = new Set(resources.data?.map((resource) => resource.id));

  const bookingsQuery = { venueId, ...range };
  const bookings = useQuery({
    queryKey: listBookingsQueryKey({ query: bookingsQuery }),
    queryFn: ({ signal }) =>
      everyPage(async (page) => {
        const query = { ...bookingsQuery, page, size: MAX_PAGE_SIZE };
        const { data } = await listBookings({ query, signal, throwOnError: true });
        return data.data;
      }),
    enabled: range !== undefined,
  });

  const blocks = useQuery({
    queryKey: listBlockedTimesQueryKey({ query: { ...range } }),
    queryFn: ({ signal }) =>
      everyPage(async (page) => {
        const query = { ...range, page, size: MAX_PAGE_SIZE };
        const { data } = await listBlockedTimes({ query, signal, throwOnError: true });
        return data.data;
      }),
    enabled: range !== undefined,
  });

  const closedDates = useQuery({
    ...listClosedDatesOptions({ query: { venueId, from: first, to: last, size: MAX_PAGE_SIZE } }),
    enabled: venue !== undefined,
    select: (reply) => reply.data.content,
  });

  return {
    isPending: [resources, bookings, blocks, closedDates].some((query) => query.isPending),
    resources: resources.data ?? [],
    bookings: bookings.data ?? [],
    blocks: (blocks.data ?? []).filter((block) => resourceIds.has(block.resourceId)),
    closedDates: closedDates.data ?? [],
  };
}
