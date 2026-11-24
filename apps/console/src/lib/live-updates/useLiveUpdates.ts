import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import type { LiveEventType } from "@turftap/contract";
import { listEvents } from "@turftap/contract/client";
import { useEffect } from "react";

const RECONNECT_DELAY_MS = 5_000;

/** The generated query names whose data each event makes stale. */
const STALE_AFTER: Record<LiveEventType, readonly string[]> = {
  "booking.changed": ["listBookings", "getBooking", "listAvailability"],
  "payment.changed": ["listPayments", "getPayment", "listBookings", "getBooking"],
};
const EVERY_LIVE_QUERY = [...new Set(Object.values(STALE_AFTER).flat())];

function refetch(queryClient: QueryClient, names: readonly string[]) {
  for (const name of names) void queryClient.invalidateQueries({ queryKey: [{ _id: name }] });
}

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

/**
 * BKG-05, PAY-07: keeps the tenant's bookings and payments fresh while the console is open.
 * After a dropped connection it reconnects and refetches everything, as events may have been missed.
 */
export function useLiveUpdates(tenantId: number | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (tenantId === undefined) return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      for (let attempt = 0; !signal.aborted; attempt++) {
        if (attempt > 0) refetch(queryClient, EVERY_LIVE_QUERY);
        const { stream } = await listEvents({ signal, sseMaxRetryAttempts: 1 });
        for await (const event of stream) refetch(queryClient, STALE_AFTER[event.type]);
        await pause(RECONNECT_DELAY_MS, signal);
      }
    })();
    return () => controller.abort();
  }, [tenantId, queryClient]);
}
