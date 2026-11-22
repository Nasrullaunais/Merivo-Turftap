import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createResourceMutation,
  deleteResourceMutation,
  getResourceQueryKey,
  listResourcesQueryKey,
  updateResourceMutation,
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

export function useChangeResource(id: number) {
  const queryClient = useQueryClient();
  const reloadList = useReloadList();
  return useMutation({
    ...updateResourceMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getResourceQueryKey({ path: { id } }) });
      await reloadList();
    },
  });
}
