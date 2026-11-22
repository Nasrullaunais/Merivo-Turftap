import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createClosedDateMutation,
  deleteClosedDateMutation,
  listClosedDatesQueryKey,
} from "@turftap/contract/client/react-query";

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listClosedDatesQueryKey() });
}

export function useCloseDate() {
  return useMutation({ ...createClosedDateMutation(), onSuccess: useReloadList() });
}

export function useReopenDate() {
  return useMutation({ ...deleteClosedDateMutation(), onSuccess: useReloadList() });
}
