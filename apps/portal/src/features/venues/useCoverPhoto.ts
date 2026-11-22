import { useQuery } from "@tanstack/react-query";
import { listPhotosOptions } from "@turftap/contract/client/react-query";

/** VEN-06: the venue's first photo, if it has any. */
export function useCoverPhoto(venueId: number) {
  return useQuery({
    ...listPhotosOptions({ query: { venueId, size: 1, sort: "position,asc" } }),
    select: (reply) => reply.data.content[0],
  });
}
