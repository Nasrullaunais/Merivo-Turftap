import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
const meAs = (role: StaffRole) => ({
  id: 1,
  phone: PHONE,
  name: "Demo Owner",
  isPlatformAdmin: false,
  tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
});
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
  hasGym: false,
  openingHours: [],
  active: true,
  ...times,
};
const christmas = { id: 31, venueId: 3, date: "2026-12-25", reason: "Christmas", ...times };
const court = {
  id: 11,
  venueId: 3,
  name: "Court 1",
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  startIntervalMinutes: 30,
  price: { amount: 450_000, currency: "LKR" },
  active: true,
  ...times,
};
/** A booking on Christmas Day in Colombo; `startsAt` and `endsAt` are UTC. */
const bookingOnChristmas = (overrides: object) => ({
  id: 70,
  venueId: 3,
  resourceId: 11,
  customerId: 5,
  customerName: "Nimal Perera",
  customerPhone: "+94771111111",
  startsAt: "2026-12-25T13:30:00.000Z",
  endsAt: "2026-12-25T14:30:00.000Z",
  status: "CONFIRMED",
  source: "ONLINE",
  price: { amount: 450_000, currency: "LKR" },
  amountDue: { amount: 450_000, currency: "LKR" },
  expiresAt: null,
  cancellationCutOffHours: 6,
  cancelReason: null,
  bankAccount: null,
  ...times,
  ...overrides,
});
const evening = bookingOnChristmas({ status: "AWAITING_PAYMENT" });
const morning = bookingOnChristmas({
  id: 71,
  customerId: 6,
  customerName: "Kamal Silva",
  customerPhone: "+94772222222",
  startsAt: "2026-12-25T01:30:00.000Z",
  endsAt: "2026-12-25T02:30:00.000Z",
});

const requestsOf = (fetch: ReturnType<typeof mockApi>, method: string) =>
  fetch.mock.calls.map(([request]) => request as Request).filter((r) => r.method === method);

/** The venue page as a Manager, where the bookings API holds `holding` on Christmas. */
function closeChristmasAs(holding: { status: string }[]) {
  signInForTesting(PHONE);
  let closed: object[] = [];
  const fetch = mockApi({
    "GET /v1/me": meAs("MANAGER"),
    "GET /v1/venues/3": arena,
    "GET /v1/resources": page([court]),
    "GET /v1/closed-dates": () => ok(page(closed)),
    "GET /v1/bookings": (request: Request) => {
      const status = new URL(request.url).searchParams.get("status");
      return ok(page(holding.filter((booking) => booking.status === status)));
    },
    "POST /v1/closed-dates": () => {
      closed = [christmas];
      return Response.json({ status: 201, message: "success", data: christmas }, { status: 201 });
    },
  });
  renderApp("/venues/3");
  return fetch;
}

const openCloseForm = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Close the venue for a day" }));
  await screen.findByRole("button", { name: "Close this date" });
};

const pickChristmas = async () => {
  await openCloseForm();
  fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: "2026-12-25" } });
  fireEvent.click(screen.getByRole("button", { name: "Close this date" }));
};

describe("VEN-02 close a venue for a day", () => {
  it("venuePage_showsUpcomingClosedDatesWithTheirReason", async () => {
    signInForTesting(PHONE);
    const fetch = mockApi({
      "GET /v1/me": meAs("FRONT_DESK"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([]),
      "GET /v1/closed-dates": page([christmas]),
    });
    renderApp("/venues/3");
    expect(await screen.findByText("Fri, 25 Dec 2026")).toBeInTheDocument();
    expect(screen.getByText("Christmas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reopen/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close this date" })).not.toBeInTheDocument();
    const query = new URL(requestsOf(fetch, "GET").find((r) => r.url.includes("closed-dates"))!.url)
      .searchParams;
    expect(query.get("venueId")).toBe("3");
    expect(query.get("from")).toBe(new Date().toLocaleDateString("en-CA"));
  });

  it("manager_closesADateWithNoBookingsStraightAway", async () => {
    const fetch = closeChristmasAs([]);
    expect(await screen.findByText("No upcoming Closed Dates.")).toBeInTheDocument();
    await openCloseForm();
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: "2026-12-25" } });
    fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: " Christmas " } });
    fireEvent.click(screen.getByRole("button", { name: "Close this date" }));
    expect(await screen.findByText("Fri, 25 Dec 2026")).toBeInTheDocument();
    const [sent] = requestsOf(fetch, "POST");
    expect(await sent!.clone().json()).toEqual({
      venueId: 3,
      date: "2026-12-25",
      reason: "Christmas",
    });
  });

  it("manager_reopensADate", async () => {
    signInForTesting(PHONE);
    let closed: object[] = [christmas];
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([]),
      "GET /v1/closed-dates": () => ok(page(closed)),
      "DELETE /v1/closed-dates/31": () => {
        closed = [];
        return ok(null);
      },
    });
    renderApp("/venues/3");
    fireEvent.click(await screen.findByRole("button", { name: "Reopen Fri, 25 Dec 2026" }));
    await waitFor(() => expect(screen.queryByText("Fri, 25 Dec 2026")).not.toBeInTheDocument());
    expect(requestsOf(fetch, "DELETE")).toHaveLength(1);
  });

  it("reopen_showsItIsBusyAndCannotBeSentTwice", async () => {
    signInForTesting(PHONE);
    let answer: (reply: Response) => void = () => {};
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([]),
      "GET /v1/closed-dates": page([christmas]),
      "DELETE /v1/closed-dates/31": () =>
        new Promise<Response>((resolve) => (answer = resolve)) as unknown as Response,
    });
    renderApp("/venues/3");
    const reopen = await screen.findByRole("button", { name: "Reopen Fri, 25 Dec 2026" });
    fireEvent.click(reopen);
    await waitFor(() => expect(reopen).toHaveAttribute("data-pending", "true"));
    fireEvent.click(reopen);
    answer(ok(null));
    await waitFor(() => expect(reopen).not.toHaveAttribute("data-pending"));
    expect(requestsOf(fetch, "DELETE")).toHaveLength(1);
  });

  it("manager_closingADateWithBookings_seesThemInTheVenuesTimeBeforeSaving", async () => {
    const fetch = closeChristmasAs([evening, morning]);
    await pickChristmas();
    expect(
      await screen.findByText("2 bookings on Fri, 25 Dec 2026 still hold their slots"),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Bookings on that date" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "07:00–08:00Court 1Kamal Silva+94772222222",
      "19:00–20:00Court 1Nimal Perera+94771111111",
    ]);
    expect(requestsOf(fetch, "POST")).toHaveLength(0);
    const queries = requestsOf(fetch, "GET")
      .filter((request) => request.url.includes("/v1/bookings"))
      .map((request) => new URL(request.url).searchParams);
    expect(queries.map((query) => query.get("status")).sort()).toEqual([
      "AWAITING_CHECK",
      "AWAITING_PAYMENT",
      "CONFIRMED",
    ]);
    for (const query of queries) {
      expect(query.get("venueId")).toBe("3");
      expect(query.get("from")).toBe("2026-12-24T18:30:00.000Z");
      expect(query.get("to")).toBe("2026-12-25T18:30:00.000Z");
    }
  });

  it("manager_confirmsClosingADateWithBookings", async () => {
    const fetch = closeChristmasAs([evening]);
    await pickChristmas();
    await screen.findByText("1 booking on Fri, 25 Dec 2026 still holds its slots");
    fireEvent.click(screen.getByRole("button", { name: "Close anyway" }));
    expect(await screen.findByText("Fri, 25 Dec 2026")).toBeInTheDocument();
    expect(screen.queryByText("Nimal Perera")).not.toBeInTheDocument();
    const [sent] = requestsOf(fetch, "POST");
    expect(await sent!.clone().json()).toEqual({ venueId: 3, date: "2026-12-25", reason: null });
  });

  it("manager_goesBackWithoutClosing", async () => {
    const fetch = closeChristmasAs([evening]);
    await pickChristmas();
    fireEvent.click(await screen.findByRole("button", { name: "Go back" }));
    expect(screen.queryByText("Nimal Perera")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close this date" })).toBeInTheDocument();
    expect(requestsOf(fetch, "POST")).toHaveLength(0);
  });
});
