import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HOLDING_STATUSES, MAX_PAGE_SIZE } from "@turftap/contract";
import { createClosedDate, listBookings } from "@turftap/contract/client";
import {
  deleteClosedDateMutation,
  listClosedDatesQueryKey,
} from "@turftap/contract/client/react-query";
import { instantInZone } from "@turftap/ui";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listClosedDatesQueryKey() });
}

const dayAfter = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + MS_PER_DAY).toISOString().slice(0, 10);

/** Bookings still holding slots on the venue's date, earliest first. */
async function holdingBookingsOn(venueId: number, date: string, timeZone: string) {
  const from = instantInZone(date, "00:00", timeZone).toISOString();
  const to = instantInZone(dayAfter(date), "00:00", timeZone).toISOString();
  const replies = await Promise.all(
    HOLDING_STATUSES.map((status) =>
      listBookings({ query: { venueId, status, from, to, size: MAX_PAGE_SIZE } }),
    ),
  );
  return replies
    .flatMap(({ data }) => data.data.content)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export type AffectedBooking = Awaited<ReturnType<typeof holdingBookingsOn>>[number];

type CloseDate = {
  venueId: number;
  date: string;
  reason: string | null;
  timeZone: string;
  confirmed: boolean;
};

/** VEN-02: until the Manager confirms, a date with bookings isn't closed; its bookings come back. */
export function useCloseDate() {
  const reloadList = useReloadList();
  return useMutation({
    mutationFn: async ({ timeZone, confirmed, ...body }: CloseDate) => {
      if (!confirmed) {
        const affected = await holdingBookingsOn(body.venueId, body.date, timeZone);
        if (affected.length > 0) return { closed: false, affected };
      }
      await createClosedDate({ body });
      return { closed: true, affected: [] };
    },
    onSuccess: ({ closed }) => (closed ? reloadList() : undefined),
  });
}

export function useReopenDate() {
  return useMutation({ ...deleteClosedDateMutation(), onSuccess: useReloadList() });
}
