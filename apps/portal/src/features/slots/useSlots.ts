import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import { listAvailabilityOptions } from "@turftap/contract/client/react-query";

/**
 * BKG-01: every start time of one resource on one of the venue's dates, free or not, each priced
 * by the server for `slots` back-to-back slots. Changing only the length keeps the old times on screen.
 */
export function useSlots(resourceId: number, date: string, slots: number, enabled = true) {
  const options = listAvailabilityOptions({
    query: { resourceId, date, slots, size: MAX_PAGE_SIZE },
  });
  return useQuery({
    ...options,
    enabled,
    placeholderData: (previous, previousQuery) => {
      const before = previousQuery?.queryKey[0].query;
      return before?.resourceId === resourceId && before.date === date
        ? keepPreviousData(previous)
        : undefined;
    },
    select: (reply) => reply.data.content,
  });
}
