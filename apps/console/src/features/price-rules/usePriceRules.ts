import { useQuery } from "@tanstack/react-query";
import { getResourceOptions, listPriceRulesOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

export function usePriceRules(resourceId: number) {
  return useQuery({
    ...listPriceRulesOptions({ query: { resourceId, size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

/** How often bookings for the resource may start; a Price Rule's times sit on it. */
export function useStartInterval(resourceId: number) {
  const { data } = useQuery({
    ...getResourceOptions({ path: { id: resourceId } }),
    select: (reply) => reply.data.startIntervalMinutes,
  });
  return data;
}
