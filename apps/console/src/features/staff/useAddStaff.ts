import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStaffMutation, listStaffQueryKey } from "@turftap/contract/client/react-query";

export function useAddStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createStaffMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listStaffQueryKey() }),
  });
}
