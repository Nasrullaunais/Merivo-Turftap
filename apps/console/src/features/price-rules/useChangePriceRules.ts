import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPriceRuleMutation,
  deletePriceRuleMutation,
  listPriceRulesQueryKey,
} from "@turftap/contract/client/react-query";

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listPriceRulesQueryKey() });
}

export function useAddPriceRule() {
  return useMutation({ ...createPriceRuleMutation(), onSuccess: useReloadList() });
}

export function useDeletePriceRule() {
  return useMutation({ ...deletePriceRuleMutation(), onSuccess: useReloadList() });
}
