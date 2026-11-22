import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVenueMutation, listVenuesQueryKey } from "@turftap/contract/client/react-query";

export function useAddVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createVenueMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listVenuesQueryKey() }),
  });
}
