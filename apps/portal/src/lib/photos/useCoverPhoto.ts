import { useQuery } from "@tanstack/react-query";
import { listPhotosOptions } from "@turftap/contract/client/react-query";

/** VEN-06: the first photo of a venue or of one resource, if it has any. */
export function useCoverPhoto(of: { venueId: number } | { resourceId: number }) {
  return useQuery({
    ...listPhotosOptions({ query: { ...of, size: 1, sort: "position,asc" } }),
    select: (reply) => reply.data.content[0],
  });
}
