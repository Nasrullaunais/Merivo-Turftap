import { useQuery } from "@tanstack/react-query";
import { getVenueOptions } from "@turftap/contract/client/react-query";

export function useVenue(id: number) {
  return useQuery({ ...getVenueOptions({ path: { id } }), select: (reply) => reply.data });
}
