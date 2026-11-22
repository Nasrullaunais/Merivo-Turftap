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

export function useBlockTime() {
  return useMutation({ ...createBlockedTimeMutation(), onSuccess: useReloadList() });
}

export function useUnblockTime() {
  return useMutation({ ...deleteBlockedTimeMutation(), onSuccess: useReloadList() });
}
