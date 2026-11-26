import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerMutation,
  listCustomersQueryKey,
} from "@turftap/contract/client/react-query";

/** POR-03: creates the customer's record at this tenant, the one time they give their name. */
export function useSaveMyName() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createCustomerMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listCustomersQueryKey() }),
  });
}
