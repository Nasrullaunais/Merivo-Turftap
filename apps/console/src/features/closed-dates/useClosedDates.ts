import { useQuery } from "@tanstack/react-query";
import { listClosedDatesOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

/** Today in the browser, as "2026-12-25". The en-CA format is already YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString("en-CA");

export function useClosedDates(venueId: number) {
  return useQuery({
    ...listClosedDatesOptions({ query: { venueId, from: today(), size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
