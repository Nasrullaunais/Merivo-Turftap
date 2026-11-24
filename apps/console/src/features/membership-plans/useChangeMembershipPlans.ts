import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMembershipPlanMutation,
  deleteMembershipPlanMutation,
  listMembershipPlansQueryKey,
} from "@turftap/contract/client/react-query";

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listMembershipPlansQueryKey() });
}

export function useAddMembershipPlan() {
  return useMutation({ ...createMembershipPlanMutation(), onSuccess: useReloadList() });
}

export function useTurnOffMembershipPlan() {
  return useMutation({ ...deleteMembershipPlanMutation(), onSuccess: useReloadList() });
}
