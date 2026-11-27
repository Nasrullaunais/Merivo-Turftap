import { useQueries } from "@tanstack/react-query";
import { MAX_PAGE_SIZE } from "@turftap/contract";
import type { Resource, Venue } from "@turftap/contract/client";
import { listAvailabilityOptions } from "@turftap/contract/client/react-query";
import { onVenueClock } from "@turftap/ui";

import { useNow } from "../lib/time/useNow";

const RECHECK_MS = 60_000;

export type FreeToday =
  { kind: "free"; from: string; count: number } | { kind: "full" } | { kind: "over" };

/** What is still free today across some of a venue's resources, from now on. */
export function useFreeToday(resources: readonly Resource[], venue: Venue) {
  const now = useNow(RECHECK_MS);
  const today = onVenueClock(new Date(now), venue.timeZone).date;
  return useQueries({
    queries: resources.map((resource) =>
      listAvailabilityOptions({
        query: { resourceId: resource.id, date: today, size: MAX_PAGE_SIZE },
      }),
    ),
    combine: (replies): FreeToday | undefined => {
      if (replies.some((reply) => !reply.data)) return undefined;
      const ahead = replies
        .flatMap((reply) => reply.data!.data.content)
        .filter((slot) => Date.parse(slot.startsAt) > now);
      const free = ahead
        .filter((slot) => slot.free)
        .map((slot) => slot.startsAt)
        .toSorted();
      if (free[0]) return { kind: "free", from: free[0], count: free.length };
      return ahead.length ? { kind: "full" } : { kind: "over" };
    },
  });
}
