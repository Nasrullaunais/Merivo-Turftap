import { useQuery } from "@tanstack/react-query";
import { listPhotosOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

/** Whose photos: a venue's own, or one resource's. */
export type PhotoOwner = { venueId: number } | { resourceId: number };

export function usePhotos(owner: PhotoOwner) {
  return useQuery({
    ...listPhotosOptions({ query: { ...owner, size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
