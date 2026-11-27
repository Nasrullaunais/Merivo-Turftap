import type { Booking, Membership } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting, signOut } from "../../lib/auth/session";
import { booking, court, customer, tenant, venue } from "../../test/fixtures";
import { byQuery, failure, inTurn, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// 1:32 AM on Sat 28 Nov in Colombo: the fixture booking starts at 6 PM, inside the 24-hour cut-off.
const NOW = "2026-11-27T20:02:00Z";
const ME = "/me";

const unpaid = booking;
/** Paid in full, on Mon 30 Nov at 6 PM: well before the cut-off. */
const confirmedLater: Booking = {
  ...booking,
  id: 42,
  status: "CONFIRMED",
  startsAt: "2026-11-30T12:30:00.000Z",
  endsAt: "2026-11-30T14:30:00.000Z",
  paid: { amount: 900_000, currency: "LKR" },
  balance: { amount: 0, currency: "LKR" },
  expiresAt: null,
  bankAccount: null,
};
/** Confirmed for tonight at 6 PM, so the 24-hour cut-off has passed. */
const confirmedTonight: Booking = {
  ...confirmedLater,
  id: 43,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
};
const playedLastWeek: Booking = {
  ...confirmedLater,
  id: 30,
  startsAt: "2026-11-20T12:30:00.000Z",
  endsAt: "2026-11-20T13:30:00.000Z",
};

const membership: Membership = {
  id: 5,
  venueId: venue.id,
  planId: 1,
  planName: "Gym monthly",
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  startsOn: "2026-11-15",
  endsOn: "2026-12-14",
  status: "ACTIVE",
  price: { amount: 500_000, currency: "LKR" },
  amountDue: { amount: 500_000, currency: "LKR" },
  paid: { amount: 500_000, currency: "LKR" },
  balance: { amount: 0, currency: "LKR" },
  expiresAt: null,
  cancelReason: null,
  bankAccount: null,
  createdAt: "2026-11-15T00:00:00.000Z",
  updatedAt: "2026-11-15T00:00:00.000Z",
};

/** Upcoming bookings are asked for with `from`, past ones with `to`. */
const bookings = (upcoming: Booking[], past: Booking[] = []) =>
  byQuery((query) => page(query.has("from") ? upcoming : past));

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/venues": page([venue]),
    "GET /v1/resources": page([court]),
    "GET /v1/bookings": bookings([unpaid]),
    "GET /v1/memberships": page([]),
    "GET /v1/bookings/41": unpaid,
    "GET /v1/resources/2": court,
    "GET /v1/venues/1": venue,
    "GET /v1/photos": page([]),
    ...overrides,
  });

const cardOf = async (id: number) =>
  within(
    (await screen.findAllByRole("article")).find((card) =>
      within(card)
        .getAllByRole("link")
        .some((link) => link.getAttribute("href")?.includes(`/bookings/${id}`)),
    )!,
  );

const patchesTo = (fetch: ReturnType<typeof mockApi>, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.method === "PATCH" && new URL(request.url).pathname === path);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  signInForTesting(customer.phone);
});
afterEach(() => {
  vi.useRealTimers();
  signOut();
});

describe("POR-04 my bookings", () => {
  it("signedOut_isAskedToSignInFirst", async () => {
    signOut();
    api();
    const router = renderPortal(ME);

    expect(
      await screen.findByRole("heading", { name: "What's your phone number?" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("upcoming_showsWhatWhenWhereAndTheState", async () => {
    api({ "GET /v1/bookings": bookings([unpaid, confirmedLater]) });
    renderPortal(ME);

    const card = await cardOf(42);
    expect(card.getByText("Futsal Court 1")).toBeInTheDocument();
    expect(card.getByText("Kick Off Arena")).toBeInTheDocument();
    expect(card.getByText("6:00 PM – 8:00 PM · 2 hours")).toBeInTheDocument();
    expect(card.getByText("Confirmed")).toBeInTheDocument();
    expect(card.getByText("Paid")).toBeInTheDocument();
    expect((await cardOf(41)).getByText("Waiting for payment")).toBeInTheDocument();
  });

  it("past_showsBookingsThatHaveEnded", async () => {
    api({ "GET /v1/bookings": bookings([], [playedLastWeek]) });
    renderPortal(`${ME}?show=past`);

    expect((await cardOf(30)).getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Past/ })).toHaveAttribute("aria-current", "page");
  });

  it("nothingBooked_pointsToTheVenues", async () => {
    api({ "GET /v1/bookings": bookings([]) });
    renderPortal(ME);

    expect(await screen.findByRole("heading", { name: "Nothing booked yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See venues/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/(\?|$)/),
    );
  });

  it("bottomNav_marksMyBookingsAsTheCurrentPage", async () => {
    api();
    renderPortal(ME);

    const [nav] = await screen.findAllByRole("navigation", { name: "Main" });
    expect(within(nav!).getByRole("link", { name: "My bookings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav!).getByRole("link", { name: "Venues" })).not.toHaveAttribute("aria-current");
  });

  it("memberships_showTheirDaysLeft", async () => {
    api({ "GET /v1/memberships": page([membership]) });
    renderPortal(`${ME}?show=memberships`);

    const card = within(await screen.findByRole("article", { name: "Gym monthly" }));
    expect(card.getByText("Active")).toBeInTheDocument();
    expect(card.getByText("Sun 15 Nov → Mon 14 Dec")).toBeInTheDocument();
    expect(card.getByText("16 days left")).toBeInTheDocument();
  });
});

describe("POR-04 send a receipt from my bookings", () => {
  it("sendReceipt_opensTheBookingsPayPage", async () => {
    api();
    const router = renderPortal(ME);

    const card = await cardOf(41);
    expect(card.getByText("18:00 left to pay")).toBeInTheDocument();
    fireEvent.click(card.getByRole("link", { name: "Send receipt" }));

    expect(await screen.findByLabelText(/Choose your receipt/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/bookings/41");
  });
});

describe("BKG-06 customer cancels", () => {
  it("beforeTheCutOff_cancelsAfterAsking_andFreesTheTime", async () => {
    const fetch = api({
      "GET /v1/bookings": inTurn(
        bookings([confirmedLater]),
        bookings([{ ...confirmedLater, status: "CANCELLED" }]),
      ),
      "PATCH /v1/bookings/42": { ...confirmedLater, status: "CANCELLED" },
    });
    renderPortal(ME);

    const card = await cardOf(42);
    expect(card.getByText("Free to cancel until 6:00 PM, Sun 29 Nov")).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: "Cancel" }));
    expect(
      card.getByText("You've paid LKR 9,000. Any refund is arranged with the venue."),
    ).toBeVisible();
    fireEvent.click(card.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(async () =>
      expect((await cardOf(42)).getByText("Cancelled")).toBeInTheDocument(),
    );
    const [patch] = patchesTo(fetch, "/v1/bookings/42");
    expect(await patch!.json()).toEqual({ status: "CANCELLED" });
    expect(screen.getByRole("heading", { name: "Cancelled or expired" })).toBeInTheDocument();
  });

  it("keepIt_leavesTheBookingAlone", async () => {
    const fetch = api({ "GET /v1/bookings": bookings([confirmedLater]) });
    renderPortal(ME);

    const card = await cardOf(42);
    fireEvent.click(card.getByRole("button", { name: "Cancel" }));
    fireEvent.click(card.getByRole("button", { name: "Keep it" }));

    expect(card.getByRole("button", { name: "Cancel" })).toHaveAttribute("aria-expanded", "false");
    expect(card.getByText("Confirmed")).toBeInTheDocument();
    expect(patchesTo(fetch, "/v1/bookings/42")).toHaveLength(0);
  });

  it("afterTheCutOff_offersTheVenuesPhoneInstead", async () => {
    api({ "GET /v1/bookings": bookings([confirmedTonight]) });
    renderPortal(ME);

    const card = await cardOf(43);
    expect(card.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(
      card.getByText("It's less than 24 hours before the start. To cancel, call the venue."),
    ).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Call 0112 345 678" })).toHaveAttribute(
      "href",
      "tel:+94112345678",
    );
  });

  it("waitingForPayment_canBeCancelledEvenAfterTheCutOff", async () => {
    const cancelled: Booking = { ...unpaid, status: "CANCELLED", expiresAt: null };
    api({
      "GET /v1/bookings": inTurn(bookings([unpaid]), bookings([cancelled])),
      "PATCH /v1/bookings/41": cancelled,
    });
    renderPortal(ME);

    const card = await cardOf(41);
    fireEvent.click(card.getByRole("button", { name: "Cancel" }));
    fireEvent.click(card.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(async () =>
      expect((await cardOf(41)).getByText("Cancelled")).toBeInTheDocument(),
    );
    expect(
      (await cardOf(41)).queryByRole("link", { name: "Send receipt" }),
    ).not.toBeInTheDocument();
  });

  it("receiptBeingChecked_offersTheVenuesPhoneInstead", async () => {
    api({ "GET /v1/bookings": bookings([{ ...confirmedLater, status: "AWAITING_CHECK" }]) });
    renderPortal(ME);

    const card = await cardOf(42);
    expect(card.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(card.getByRole("link", { name: "Call 0112 345 678" })).toBeInTheDocument();
  });

  it("refusedByTheServer_showsTheCallOptionOnceTheListReloads", async () => {
    api({
      "GET /v1/bookings": inTurn(
        bookings([confirmedLater]),
        bookings([{ ...confirmedTonight, id: 42 }]),
      ),
      "PATCH /v1/bookings/42": failure(
        409,
        "tt_bkg_006",
        "It's too late to cancel online. Please call Kick Off Arena on +94112345678",
      ),
    });
    renderPortal(ME);

    const card = await cardOf(42);
    fireEvent.click(card.getByRole("button", { name: "Cancel" }));
    fireEvent.click(card.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(async () =>
      expect((await cardOf(42)).getByRole("link", { name: /^Call/ })).toBeInTheDocument(),
    );
  });
});

describe("MEM-02, MEM-04 memberships in my bookings", () => {
  const unpaidMembership: Membership = {
    ...membership,
    id: 6,
    status: "AWAITING_PAYMENT",
    paid: { amount: 0, currency: "LKR" },
    balance: membership.price,
    expiresAt: booking.expiresAt,
  };

  it("active_offersToRenewFromTheDayAfterItEnds", async () => {
    api({ "GET /v1/memberships": page([membership]) });
    renderPortal(`${ME}?show=memberships`);

    const card = within(await screen.findByRole("article", { name: "Gym monthly" }));
    expect(card.getByText("Renew now and the next one starts Tue 15 Dec.")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Renew" })).toHaveAttribute(
      "href",
      expect.stringContaining("/plans/1"),
    );
  });

  it("alreadyRenewed_saysWhenTheNextOneStarts_insteadOfRenew", async () => {
    const next = { ...unpaidMembership, startsOn: "2026-12-15", endsOn: "2027-01-14" };
    api({ "GET /v1/memberships": page([next, membership]) });
    renderPortal(`${ME}?show=memberships`);

    const [, current] = await screen.findAllByRole("article", { name: "Gym monthly" });
    expect(within(current!).getByText("Next one starts Tue 15 Dec")).toBeInTheDocument();
    expect(within(current!).queryByRole("link", { name: "Renew" })).not.toBeInTheDocument();
  });

  it("waitingForPayment_sendsReceiptOnItsPage_orCancelsAfterAsking", async () => {
    const waiting = { ...unpaidMembership, startsOn: "2026-12-01", endsOn: "2026-12-30" };
    const cancelled = { ...waiting, status: "CANCELLED" as const, expiresAt: null };
    const fetch = api({
      "GET /v1/memberships": inTurn(page([waiting]), page([cancelled])),
      "PATCH /v1/memberships/6": cancelled,
    });
    renderPortal(`${ME}?show=memberships`);

    const card = within(await screen.findByRole("article", { name: "Gym monthly" }));
    expect(card.getByRole("link", { name: "Send receipt" })).toHaveAttribute(
      "href",
      expect.stringContaining("/memberships/6"),
    );
    fireEvent.click(card.getByRole("button", { name: "Cancel" }));
    expect(card.getByRole("region", { name: "Cancel this membership?" })).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(async () =>
      expect(
        within(await screen.findByRole("article", { name: "Gym monthly" })).getByText("Cancelled"),
      ).toBeInTheDocument(),
    );
    const [patch] = patchesTo(fetch, "/v1/memberships/6");
    expect(await patch!.json()).toEqual({ status: "CANCELLED" });
  });

  it("active_cannotBeCancelledHere", async () => {
    api({ "GET /v1/memberships": page([membership]) });
    renderPortal(`${ME}?show=memberships`);

    const card = within(await screen.findByRole("article", { name: "Gym monthly" }));
    expect(card.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});
