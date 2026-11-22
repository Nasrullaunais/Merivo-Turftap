import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getResourceOptions,
  getVenueOptions,
  listBlockedTimesOptions,
} from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

/** Blocks that hadn't ended when the page opened. "Now" is fixed so the query key stays the same. */
export function useBlockedTimes(resourceId: number) {
  const [from] = useState(() => new Date().toISOString());
  return useQuery({
    ...listBlockedTimesOptions({ query: { resourceId, from, size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/** The time zone of the venue a resource belongs to; times are typed and shown in it. */
export function useVenueTimeZone(resourceId: number) {
  const { data: venueId } = useQuery({
    ...getResourceOptions({ path: { id: resourceId } }),
    select: (reply) => reply.data.venueId,
  });
  const { data: timeZone } = useQuery({
    ...getVenueOptions({ path: { id: venueId ?? 0 } }),
    enabled: venueId !== undefined,
    select: (reply) => reply.data.timeZone,
  });
  return timeZone;
}
