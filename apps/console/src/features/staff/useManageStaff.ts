import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  deleteStaffMutation,
  getMeQueryKey,
  listStaffQueryKey,
  updateStaffMutation,
} from "@turftap/contract/client/react-query";

/** After a change the list reloads, and so does the caller's own access, in case they changed themselves. */
function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: listStaffQueryKey() }),
      queryClient.refetchQueries({ queryKey: getMeQueryKey() }),
    ]);
    await router.invalidate();
  };
}

export function useChangeRole() {
  return useMutation({ ...updateStaffMutation(), onSuccess: useRefreshAfterChange() });
}

export function useRemoveStaff() {
  return useMutation({ ...deleteStaffMutation(), onSuccess: useRefreshAfterChange() });
}
