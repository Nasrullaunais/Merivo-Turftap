import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVenueQueryKey,
  listVenuesQueryKey,
  updateVenueMutation,
} from "@turftap/contract/client/react-query";

export function useChangeVenue(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateVenueMutation(),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: getVenueQueryKey({ path: { id } }) }),
        queryClient.invalidateQueries({ queryKey: listVenuesQueryKey() }),
      ]),
  });
}
