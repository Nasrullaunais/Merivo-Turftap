import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { booking, court, customer, slot, tenant, venue } from "../../test/fixtures";
import { failure, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

const NOW = "2026-11-27T20:00:00Z";
// 18:00 in Colombo (UTC+5:30) on Saturday 28 November, for two one-hour slots.
const AT_18 = "2026-11-28T12:30:00.000Z";
const CONFIRM = `/book?resourceId=2&startsAt=${encodeURIComponent(AT_18)}&count=2`;
const TWO_HOURS_RUPEES = 9000;

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/customers": page([customer]),
    "GET /v1/resources/2": court,
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    "GET /v1/price-rules": page([]),
    "GET /v1/closed-dates": page([]),
    "GET /v1/availability": page([slot(AT_18, TWO_HOURS_RUPEES)]),
    "POST /v1/bookings": booking,
    "GET /v1/bookings/41": booking,
    ...overrides,
  });

const requestsTo = (fetch: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.method === method && new URL(request.url).pathname === path);

const confirmButton = async () => {
  const button = await screen.findByRole("button", { name: "Confirm booking" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  signInForTesting(customer.phone);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("BKG-02 book online", () => {
  it("confirm_showsTheTimeThePriceAndTheAdvanceToPayNow", async () => {
    const fetch = api();
    renderPortal(CONFIRM);

    expect(await screen.findByRole("heading", { name: "Check your booking" })).toBeInTheDocument();
    expect(screen.getByText("Sat 28 Nov")).toBeInTheDocument();
    expect(screen.getByText("6:00 PM – 8:00 PM")).toBeInTheDocument();
    expect(screen.getByText("2 hours")).toBeInTheDocument();
    expect(await screen.findByText("LKR 9,000")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /^LKR.4,500 now, LKR.4,500 at the venue$/ }),
    ).toHaveTextContent("50%");
    expect(screen.getAllByText("LKR 4,500")).toHaveLength(2);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Confirm");
    expect(screen.getByText(/you have 20 minutes to send the bank transfer/)).toBeInTheDocument();
    const [asked] = requestsTo(fetch, "GET", "/v1/availability");
    expect(Object.fromEntries(new URL(asked!.url).searchParams)).toMatchObject({
      resourceId: "2",
      date: "2026-11-28",
      slots: "2",
    });
  });

  it("confirm_booksTheChosenTime_andOpensHowToPay", async () => {
    const fetch = api();
    const router = renderPortal(CONFIRM);

    fireEvent.click(await confirmButton());

    expect(
      await screen.findByRole("heading", { name: "Send LKR 4,500 to confirm" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/bookings/41");
    const [sent] = requestsTo(fetch, "POST", "/v1/bookings");
    expect(await sent!.json()).toEqual({ resourceId: 2, startsAt: AT_18, slots: 2 });
  });

  it("payAtVenue_isConfirmedStraightAway_withThePriceToPayThere", async () => {
    const atVenue = { ...venue, payAtVenue: true };
    const confirmed = {
      ...booking,
      status: "CONFIRMED",
      amountDue: { amount: 0, currency: "LKR" },
      expiresAt: null,
      bankAccount: null,
    };
    api({
      "GET /v1/venues/1": atVenue,
      "POST /v1/bookings": confirmed,
      "GET /v1/bookings/41": confirmed,
    });
    renderPortal(CONFIRM);

    expect(
      await screen.findByRole("img", { name: /^LKR.0 now, LKR.9,000 at the venue$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Transfer")).not.toBeInTheDocument();
    fireEvent.click(await confirmButton());

    expect(await screen.findByRole("heading", { name: "You're booked" })).toBeInTheDocument();
    expect(screen.getByText("Pay LKR 9,000 at the venue.")).toBeInTheDocument();
    expect(screen.queryByText("Choose your receipt")).not.toBeInTheDocument();
  });

  it("justTaken_goesBackToTheTimes_withAClearMessage", async () => {
    const fetch = api({
      "POST /v1/bookings": failure(409, "tt_bkg_002", "That slot was just taken"),
    });
    const router = renderPortal(CONFIRM);

    fireEvent.click(await confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("That time isn't free any more");
    expect(router.state.location.pathname).toBe("/resources/2");
    expect(router.state.location.search).toMatchObject({ date: "2026-11-28" });
    await waitFor(() =>
      expect(requestsTo(fetch, "GET", "/v1/availability").length).toBeGreaterThan(1),
    );
  });

  it("timeTakenBeforeConfirming_goesBackToTheTimes", async () => {
    api({ "GET /v1/availability": page([slot(AT_18, TWO_HOURS_RUPEES, false)]) });
    const router = renderPortal(CONFIRM);

    expect(await screen.findByRole("alert")).toHaveTextContent("That time isn't free any more");
    expect(router.state.location.pathname).toBe("/resources/2");
  });

  it("alreadyWaitingForPayment_offersThatBooking", async () => {
    api({
      "POST /v1/bookings": failure(409, "tt_bkg_003", "You already have a booking waiting"),
      "GET /v1/bookings": page([{ ...booking, id: 38 }]),
    });
    renderPortal(CONFIRM);

    fireEvent.click(await confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You have a booking waiting for payment",
    );
    expect(await screen.findByRole("link", { name: "Open that booking" })).toHaveAttribute(
      "href",
      expect.stringContaining("/bookings/38"),
    );
    expect(screen.queryByRole("button", { name: "Confirm booking" })).not.toBeInTheDocument();
  });
});
