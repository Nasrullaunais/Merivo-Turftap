import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createResourceMutation,
  deleteResourceMutation,
  listResourcesQueryKey,
} from "@turftap/contract/client/react-query";

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listResourcesQueryKey() });
}

export function useAddResource() {
  return useMutation({ ...createResourceMutation(), onSuccess: useReloadList() });
}

export function useTurnOffResource() {
  return useMutation({ ...deleteResourceMutation(), onSuccess: useReloadList() });
}
