import { useQuery } from "@tanstack/react-query";
import { listPriceRulesOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

export function usePriceRules(resourceId: number) {
  return useQuery({
    ...listPriceRulesOptions({ query: { resourceId, size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
