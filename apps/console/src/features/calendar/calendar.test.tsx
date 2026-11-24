import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createQueryClient } from "@turftap/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { setActiveTenantId } from "../../lib/tenant/activeTenant";
import { mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";
import { BookingCalendar } from "./BookingCalendar";
import type { SlotPress } from "./CalendarGrid";

const PHONE = "+94771234567";
// 08:30 on Friday 25 Dec 2026 in Colombo; the tests run in a New York browser.
const NOW = "2026-12-25T03:00:00.000Z";

const ok = (data: unknown) => Response.json({ status: 200, message: "success", data });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const times = { createdAt: "2026-11-22T04:00:00.000Z", updatedAt: "2026-11-22T04:00:00.000Z" };
const arena = {
  id: 3,
  name: "City Arena",
  description: null,
  address: "12 Galle Road, Colombo",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 100,
  paymentTimeLimitMinutes: 30,
  cancellationCutOffHours: 6,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  openingHours: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens: "06:00", closes: "23:00" })),
  active: true,
  ...times,
};
const resource = (id: number, name: string) => ({
  id,
  venueId: 3,
  name,
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  startIntervalMinutes: 30,
  price: { amount: 450_000, currency: "LKR" },
  active: true,
  ...times,
});
const court1 = resource(11, "Court 1");
const court2 = resource(12, "Court 2");
const lkr = (amount: number) => ({ amount, currency: "LKR" });
const booking = (id: number, fields: object) => ({
  id,
  venueId: 3,
  resourceId: 11,
  customerId: 7,
  customerName: "Nimal Perera",
  customerPhone: "+94770001111",
  repeatSeriesId: null,
  startsAt: "2026-12-25T13:30:00.000Z",
  endsAt: "2026-12-25T14:30:00.000Z",
  status: "CONFIRMED",
  source: "ONLINE",
  price: lkr(450_000),
  amountDue: lkr(450_000),
  paid: lkr(450_000),
  balance: lkr(0),
  expiresAt: null,
  cancellationCutOffHours: 6,
  cancelReason: null,
  bankAccount: null,
  ...times,
  ...fields,
});
const repainting = {
  id: 41,
  resourceId: 12,
  startsAt: "2026-12-25T04:30:00.000Z",
  endsAt: "2026-12-25T06:30:00.000Z",
  reason: "Repainting",
  ...times,
};

/** A stream the test writes events into, as GET /v1/events would send them. */
function openStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (c) => void (controller = c) });
  return {
    response: new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
    send: (event: object) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)),
  };
}

type Api = { bookings: object[]; blocks?: object[]; closedDates?: object[]; pageSize?: number };

/** The page the request asks for, `pageSize` items long. */
function pageOf(items: object[], request: Request, pageSize = items.length || 1) {
  const number = Number(new URL(request.url).searchParams.get("page") ?? 0);
  const content = items.slice(number * pageSize, (number + 1) * pageSize);
  return ok({
    ...page(content),
    page: number,
    size: pageSize,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  });
}

function mockVenueApi(api: Api) {
  const streams: ReturnType<typeof openStream>[] = [];
  const fetch = mockApi({
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Desk",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role: "FRONT_DESK" })],
    },
    "GET /v1/venues": page([arena]),
    "GET /v1/resources": page([court1, court2]),
    "GET /v1/bookings": (request: Request) => pageOf(api.bookings, request, api.pageSize),
    "GET /v1/blocked-times": () => ok(page(api.blocks ?? [])),
    "GET /v1/closed-dates": () => ok(page(api.closedDates ?? [])),
    "GET /v1/events": () => {
      const stream = openStream();
      streams.push(stream);
      return stream.response;
    },
  });
  signInForTesting(PHONE);
  return { fetch, streams };
}

const cardFor = (time: string) => screen.getByText(time).closest<HTMLElement>("button, div")!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BKG-05 booking calendar", () => {
  it("dayView_showsABookingAtTheVenuesTimeInAnotherTimeZone", async () => {
    const { fetch } = mockVenueApi({ bookings: [booking(1, {})] });
    renderApp("/calendar");

    expect(await screen.findByText("19:00–20:00")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fri, 25 Dec 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Free: Court 1, Fri 25 Dec, 19:00" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Free: Court 1, Fri 25 Dec, 19:30" })).toBeNull();
    expect(screen.getByRole("button", { name: "Free: Court 1, Fri 25 Dec, 20:00" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Free: Court 2, Fri 25 Dec, 19:00" })).toBeVisible();
    const asked = fetch.mock.calls
      .map(([request]) => new URL((request as Request).url))
      .find((url) => url.pathname === "/v1/bookings")!;
    // The day's whole week (Monday to Sunday) loads at once, from midnight on the venue's clock.
    expect(asked.searchParams.get("from")).toBe("2026-12-20T18:30:00.000Z");
    expect(asked.searchParams.get("to")).toBe("2026-12-27T18:30:00.000Z");
  });

  it("dayView_showsBookingsFromEveryPage", async () => {
    mockVenueApi({
      bookings: [booking(1, {}), booking(2, { resourceId: 12, customerName: "Sunil Silva" })],
      pageSize: 1,
    });
    renderApp("/calendar");

    expect(await screen.findByText("Nimal Perera")).toBeInTheDocument();
    expect(await screen.findByText("Sunil Silva")).toBeInTheDocument();
  });

  it("dayView_showsEachStateWithItsIconAndHidesEndedBookings", async () => {
    mockVenueApi({
      bookings: [
        booking(1, {
          status: "AWAITING_PAYMENT",
          startsAt: "2026-12-25T04:30:00.000Z",
          endsAt: "2026-12-25T05:30:00.000Z",
        }),
        booking(2, {
          status: "AWAITING_CHECK",
          startsAt: "2026-12-25T07:30:00.000Z",
          endsAt: "2026-12-25T08:30:00.000Z",
        }),
        booking(3, { status: "CONFIRMED" }),
        booking(4, {
          status: "CANCELLED",
          startsAt: "2026-12-25T10:30:00.000Z",
          endsAt: "2026-12-25T11:30:00.000Z",
        }),
      ],
      blocks: [repainting],
    });
    renderApp("/calendar");

    await screen.findByText("19:00–20:00");
    const iconIn = (time: string) =>
      within(cardFor(time)).getByRole("img").getAttribute("aria-label");
    expect(iconIn("10:00–11:00")).toBe("Waiting for payment");
    expect(iconIn("13:00–14:00")).toBe("Waiting for receipt check");
    expect(iconIn("19:00–20:00")).toBe("Confirmed");
    expect(iconIn("10:00–12:00")).toBe("Blocked");
    expect(screen.getByText("Repainting")).toBeInTheDocument();
    expect(screen.queryByText("16:00–17:00")).toBeNull();
    expect(screen.getByRole("button", { name: "Free: Court 1, Fri 25 Dec, 16:00" })).toBeVisible();
  });

  it("dayView_showsANewBookingWhenALiveEventArrives", async () => {
    const api: Api = { bookings: [booking(1, {})] };
    const { streams } = mockVenueApi(api);
    renderApp("/calendar");
    await screen.findByText("19:00–20:00");
    await vi.waitFor(() => expect(streams).toHaveLength(1));

    api.bookings = [
      ...api.bookings,
      booking(2, { resourceId: 12, customerName: "Sunil Silva", status: "AWAITING_PAYMENT" }),
    ];
    streams[0]!.send({ type: "booking.changed", id: 2 });

    expect(await screen.findByText("Sunil Silva")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Free: Court 2, Fri 25 Dec, 19:00" })).toBeNull();
  });

  it("weekView_showsOneResourceForSevenDaysWithClosedDays", async () => {
    mockVenueApi({
      bookings: [booking(1, {}), booking(2, { resourceId: 12, customerName: "Sunil Silva" })],
      closedDates: [{ id: 5, venueId: 3, date: "2026-12-25", reason: "Christmas", ...times }],
    });
    renderApp("/calendar");
    fireEvent.click(await screen.findByRole("button", { name: "Week" }));

    expect(
      await screen.findByRole("heading", { name: "21 Dec – 27 Dec 2026" }),
    ).toBeInTheDocument();
    for (const day of ["Mon 21 Dec", "Tue 22 Dec", "Sat 26 Dec", "Sun 27 Dec"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
    expect(screen.getByText("Christmas")).toBeInTheDocument();
    expect(screen.getAllByText("Closed")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Free: Court 1, Thu 24 Dec, 19:00" })).toBeVisible();
    expect(screen.queryByText("Nimal Perera")).toBeNull();
    expect(screen.queryByText("Sunil Silva")).toBeNull();
  });

  it("slotPress_givesTheResourceAndTheVenuesInstant", async () => {
    mockVenueApi({ bookings: [] });
    setActiveTenantId(1);
    const onSlotPress = vi.fn<SlotPress>();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <BookingCalendar onSlotPress={onSlotPress} />
      </QueryClientProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Free: Court 2, Fri 25 Dec, 19:00" }),
    );

    expect(onSlotPress).toHaveBeenCalledWith({
      resource: court2,
      startsAt: "2026-12-25T13:30:00.000Z",
      timeZone: "Asia/Colombo",
    });
  });
});

describe("BKG-05 finding a day on the calendar", () => {
  const onWednesday = {
    customerName: "Sunil Silva",
    startsAt: "2026-12-23T13:30:00.000Z",
    endsAt: "2026-12-23T14:30:00.000Z",
  };

  it("weekStrip_countsEachDaysBookingsAndOpensTheDayPressed", async () => {
    mockVenueApi({
      bookings: [booking(1, {}), booking(2, onWednesday)],
      closedDates: [{ id: 5, venueId: 3, date: "2026-12-24", reason: "Repairs", ...times }],
    });
    renderApp("/calendar");
    await screen.findByText("Nimal Perera");

    const strip = screen.getByRole("list", { name: "Days of this week" });
    expect(within(strip).getByRole("button", { name: "Fri 25 Dec, 1 booking" })).toBeVisible();
    expect(within(strip).getByRole("button", { name: "Thu 24 Dec, closed" })).toBeVisible();
    expect(within(strip).getByRole("button", { name: "Sun 27 Dec, closed" })).toBeVisible();
    fireEvent.click(within(strip).getByRole("button", { name: "Wed 23 Dec, 1 booking" }));

    expect(await screen.findByRole("heading", { name: "Wed, 23 Dec 2026" })).toBeInTheDocument();
    expect(await screen.findByText("Sunil Silva")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText("Nimal Perera")).toBeNull());
  });

  it("arrowKeysAndT_moveBetweenDaysAndBackToToday", async () => {
    mockVenueApi({ bookings: [] });
    renderApp("/calendar");
    await screen.findByRole("heading", { name: "Fri, 25 Dec 2026" });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByRole("heading", { name: "Sat, 26 Dec 2026" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(await screen.findByRole("heading", { name: "Thu, 24 Dec 2026" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "t" });
    expect(await screen.findByRole("heading", { name: "Fri, 25 Dec 2026" })).toBeInTheDocument();
  });

  it("stateTiles_countTheDaysBookingsInEachState", async () => {
    mockVenueApi({
      bookings: [
        booking(1, {}),
        booking(2, { resourceId: 12 }),
        booking(3, {
          status: "AWAITING_PAYMENT",
          startsAt: "2026-12-25T04:30:00.000Z",
          endsAt: "2026-12-25T05:30:00.000Z",
        }),
        booking(4, onWednesday),
      ],
    });
    renderApp("/calendar");
    await screen.findByText("10:00–11:00");

    const tiles = screen.getByRole("group", { name: "Bookings by state" });
    const tile = (name: string) => within(tiles).getByRole("button", { name: new RegExp(name) });
    expect(tile("^Bookings")).toHaveTextContent("3");
    expect(tile("Waiting for payment")).toHaveTextContent("1");
    expect(tile("Waiting for receipt check")).toHaveTextContent("0");
    expect(tile("Confirmed")).toHaveTextContent("2");

    fireEvent.click(tile("Confirmed"));
    expect(tile("Confirmed")).toHaveAttribute("aria-pressed", "true");
  });
});
