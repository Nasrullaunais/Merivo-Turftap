import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBlockedTimeMutation,
  deleteBlockedTimeMutation,
  listBlockedTimesQueryKey,
} from "@turftap/contract/client/react-query";

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listBlockedTimesQueryKey() });
}

/** The form shows why a block was refused, such as a clash with a booking. */
export function useBlockTime() {
  return useMutation({
    ...createBlockedTimeMutation(),
    onSuccess: useReloadList(),
    meta: { silent: true },
  });
}

export function useUnblockTime() {
  return useMutation({ ...deleteBlockedTimeMutation(), onSuccess: useReloadList() });
}
