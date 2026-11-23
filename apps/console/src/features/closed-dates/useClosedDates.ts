import { useQuery } from "@tanstack/react-query";
import {
  getVenueOptions,
  listClosedDatesOptions,
  listResourcesOptions,
} from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

/** Today in the browser, as "2026-12-25". The en-CA format is already YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString("en-CA");

export function useClosedDates(venueId: number) {
  return useQuery({
    ...listClosedDatesOptions({ query: { venueId, from: today(), size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}

export function useVenueTimeZone(venueId: number) {
  const { data: timeZone } = useQuery({
    ...getVenueOptions({ path: { id: venueId } }),
    select: (reply) => reply.data.timeZone,
  });
  return timeZone;
}

export function useResourceNames(venueId: number) {
  const { data: names } = useQuery({
    ...listResourcesOptions({ query: { venueId, size: LIST_SIZE } }),
    select: (reply) => new Map(reply.data.content.map(({ id, name }) => [id, name])),
  });
  return names;
}
