import { getVenueOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

/** Waits while `venueId` is still unknown. A missing venue is shown on the page, not as a toast. */
export function useVenue(venueId: number | undefined) {
  return useQuery({
    ...getVenueOptions({ path: { id: venueId! } }),
    enabled: venueId !== undefined,
    select: (reply) => reply.data,
    meta: { silent: true },
  });
}
