import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { listBookingsOptions } from "@turftap/contract/client/react-query";
import { createQueryClient } from "@turftap/ui";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockApi } from "../../test/mockApi";
import { signInForTesting } from "../auth/session";
import { setActiveTenantId } from "../tenant/activeTenant";
import { useLiveUpdates } from "./useLiveUpdates";

const PHONE = "+94771234567";
const TENANT_ID = 1;
const RECONNECT_DELAY_MS = 5_000;

const page = (ids: number[]) => ({
  content: ids.map((id) => ({ id })),
  page: 0,
  size: 20,
  totalElements: ids.length,
  totalPages: 1,
});

/** A stream the test writes events into, as GET /v1/events would send them. */
function openStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  return {
    response: new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
    send: (event: object) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)),
    drop: () => controller.close(),
  };
}

function BookingIds() {
  useLiveUpdates(TENANT_ID);
  const bookings = useQuery({ ...listBookingsOptions(), select: (reply) => reply.data.content });
  return <p>Bookings: {bookings.data?.map((booking) => booking.id).join(", ")}</p>;
}

/** Bookings the API lists, a new one each time it is asked, and every stream the console opens. */
function renderWithApi() {
  signInForTesting(PHONE);
  setActiveTenantId(TENANT_ID);
  const streams: ReturnType<typeof openStream>[] = [];
  const ids: number[] = [];
  const fetch = mockApi({
    "GET /v1/bookings": () => {
      ids.push(ids.length + 1);
      return Response.json({ status: 200, message: "success", data: page(ids) });
    },
    "GET /v1/events": () => {
      const stream = openStream();
      streams.push(stream);
      return stream.response;
    },
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <BookingIds />
    </QueryClientProvider>,
  );
  return { fetch, streams };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("BKG-05, PAY-07 live updates in the Staff Console", () => {
  it("liveUpdates_refetchesTheBookingListWhenABookingChanges", async () => {
    const { fetch, streams } = renderWithApi();
    await screen.findByText("Bookings: 1");
    await vi.waitFor(() => expect(streams).toHaveLength(1));

    streams[0]!.send({ type: "booking.changed", id: 2 });

    await screen.findByText("Bookings: 1, 2");
    const opened = fetch.mock.calls
      .map(([request]) => request as Request)
      .find((request) => request.url.endsWith("/v1/events"))!;
    expect(opened.headers.get("Authorization")).toBe(`Bearer fake:${PHONE}`);
    expect(opened.headers.get("X-Tenant-Id")).toBe(String(TENANT_ID));
  });

  it("liveUpdates_reconnectsAndRefetchesAfterTheStreamDrops", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { streams } = renderWithApi();
    await screen.findByText("Bookings: 1");
    await vi.waitFor(() => expect(streams).toHaveLength(1));

    streams[0]!.drop();
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    await vi.waitFor(() => expect(streams).toHaveLength(2));
    await screen.findByText("Bookings: 1, 2");
    streams[1]!.send({ type: "payment.changed", id: 7 });
    await screen.findByText("Bookings: 1, 2, 3");
  });
});
