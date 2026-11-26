import { useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import { listClosedDatesOptions } from "@turftap/contract/client/react-query";

/** The venue's Closed Dates from `from` to `to`, as date → reason. */
export function useClosedDates(venueId: number, from: string, to: string) {
  return useQuery({
    ...listClosedDatesOptions({ query: { venueId, from, to, size: MAX_PAGE_SIZE } }),
    select: (reply) =>
      new Map(reply.data.content.map((closed) => [closed.date, closed.reason] as const)),
  });
}
