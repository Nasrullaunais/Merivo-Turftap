import { MAX_PAGE_SIZE, type Money } from "@turftap/contract";
import type { Resource } from "@turftap/contract/client";
import { listPriceRulesOptions } from "@turftap/contract/client/react-query";
import { useQuery } from "@tanstack/react-query";

/** The cheapest and dearest slot price, counting the resource's Price Rules. */
export function usePriceRange(resource: Resource) {
  return useQuery({
    ...listPriceRulesOptions({ query: { resourceId: resource.id, size: MAX_PAGE_SIZE } }),
    select: (reply): { lowest: Money; highest: Money } => {
      const prices = [resource.price, ...reply.data.content.map((rule) => rule.price)];
      const byAmount = prices.toSorted((a, b) => a.amount - b.amount);
      return { lowest: byAmount[0]!, highest: byAmount.at(-1)! };
    },
  });
}
