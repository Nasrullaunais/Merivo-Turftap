import { useQueries } from "@tanstack/react-query";
import { MAX_PAGE_SIZE, type Money } from "@turftap/contract";
import type { Resource } from "@turftap/contract/client";
import { listPriceRulesOptions } from "@turftap/contract/client/react-query";

/** The cheapest slot among some resources, counting their Price Rules, with that slot's length. */
export function useLowestPrice(resources: readonly Resource[]) {
  return useQueries({
    queries: resources.map((resource) =>
      listPriceRulesOptions({ query: { resourceId: resource.id, size: MAX_PAGE_SIZE } }),
    ),
    combine: (replies): { price: Money; slotMinutes: number } | undefined => {
      if (replies.some((reply) => !reply.data)) return undefined;
      const prices = resources.flatMap((resource, index) =>
        [resource.price, ...replies[index]!.data!.data.content.map((rule) => rule.price)].map(
          (price) => ({ price, slotMinutes: resource.slotMinutes }),
        ),
      );
      return prices.toSorted((a, b) => a.price.amount - b.price.amount)[0];
    },
  });
}
