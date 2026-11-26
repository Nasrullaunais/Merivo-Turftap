import { useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import { listAvailabilityOptions } from "@turftap/contract/client/react-query";
import { onVenueClock } from "@turftap/ui";

/**
 * BKG-02: the server's price for `count` slots from `startsAt`, and whether they are still free.
 * `null` when that start isn't offered at all. Waits until the venue's time zone is known.
 */
export function useQuote(resourceId: number, startsAt: string, count: number, timeZone?: string) {
  const date = timeZone ? onVenueClock(startsAt, timeZone).date : "";
  return useQuery({
    ...listAvailabilityOptions({
      query: { resourceId, date, slots: count, size: MAX_PAGE_SIZE },
    }),
    enabled: timeZone !== undefined,
    // The time list may have been open for a while; ask again before showing it as free.
    staleTime: 0,
    select: (reply) =>
      reply.data.content.find((slot) => Date.parse(slot.startsAt) === Date.parse(startsAt)) ?? null,
  });
}
