import type { Membership, MembershipPlan } from "@turftap/contract/client";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInForTesting, signOut } from "../../lib/auth/session";
import { customer, gym, membership, plan, tenant } from "../../test/fixtures";
import { failure, mockApi } from "../../test/mockApi";
import { page, renderPortal } from "../../test/renderPortal";

// 1:32 AM on Sat 28 Nov in Colombo.
const NOW = "2026-11-27T20:02:00Z";
const BUY_PAGE = `/plans/${plan.id}`;

const monthly: MembershipPlan = {
  ...plan,
  id: 6,
  name: "Gym monthly",
  lengthCount: 1,
  lengthUnit: "MONTHS",
  price: { amount: 600_000, currency: "LKR" },
};
/** Paid and running until Mon 14 Dec. */
const activeUntil14Dec: Membership = {
  ...membership,
  id: 11,
  startsOn: "2026-11-15",
  endsOn: "2026-12-14",
  status: "ACTIVE",
  paid: plan.price,
  balance: { amount: 0, currency: "LKR" },
  expiresAt: null,
  bankAccount: null,
};

const api = (overrides: Record<string, unknown> = {}) =>
  mockApi({
    "GET /v1/tenant": tenant,
    "GET /v1/customers": page([customer]),
    "GET /v1/venues/3": gym,
    "GET /v1/resources": page([]),
    "GET /v1/photos": page([]),
    "GET /v1/membership-plans": page([plan, monthly]),
    "GET /v1/membership-plans/8": plan,
    "GET /v1/memberships": page([]),
    "POST /v1/memberships": membership,
    "GET /v1/memberships/16": membership,
    ...overrides,
  });

const requestsTo = (fetch: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetch.mock.calls
    .map(([request]) => request as Request)
    .filter((request) => request.method === method && new URL(request.url).pathname === path);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  signInForTesting(customer.phone);
});
afterEach(() => {
  vi.useRealTimers();
  signOut();
});

describe("MEM-02 gym memberships on the venue page", () => {
  it("gymVenue_listsItsPlansWithPriceAndLength", async () => {
    api();
    renderPortal(`/venues/${gym.id}`);

    const plans = await screen.findByRole("region", { name: "Gym memberships" });
    const link = await within(plans).findByRole("link", { name: /Gym 10 days/ });
    expect(link).toHaveTextContent("LKR 2,500");
    expect(link).toHaveTextContent("10 days");
    expect(link).toHaveAttribute("href", expect.stringContaining(BUY_PAGE));
    expect(within(plans).getByRole("link", { name: /Gym monthly/ })).toHaveTextContent("1 month");
  });

  it("payAtVenue_plansAreBoughtAtTheDesk", async () => {
    api({ "GET /v1/venues/3": { ...gym, payAtVenue: true } });
    renderPortal(`/venues/${gym.id}`);

    const plans = await screen.findByRole("region", { name: "Gym memberships" });
    expect(await within(plans).findAllByText("Buy at the desk")).toHaveLength(2);
    expect(within(plans).queryByRole("link")).not.toBeInTheDocument();
  });

  it("venueWithoutAGym_showsNoMemberships", async () => {
    api({ "GET /v1/venues/3": { ...gym, hasGym: false } });
    renderPortal(`/venues/${gym.id}`);

    expect(await screen.findByRole("heading", { name: "Choose what to book" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Gym memberships" })).not.toBeInTheDocument();
  });
});

describe("MEM-02 buy a membership", () => {
  it("signedOut_isAskedToSignInFirst", async () => {
    signOut();
    api();
    const router = renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "What's your phone number?" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("startsToday_andShowsTheLastDayFromThePlansLength", async () => {
    api();
    renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("button", { name: "Today, Saturday 28 November" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Sat 28 Nov to Mon 7 Dec")).toBeInTheDocument();
    expect(screen.getByText("LKR 2,500")).toBeInTheDocument();
  });

  it("aMonthLongPlan_endsTheDayBeforeTheSameDateNextMonth", async () => {
    api({ "GET /v1/membership-plans/8": monthly });
    renderPortal(BUY_PAGE);

    expect(await screen.findByText("Sat 28 Nov to Sun 27 Dec")).toBeInTheDocument();
  });

  it("pickingADay_movesTheDates_andBuysFromThatDay", async () => {
    const fetch = api();
    const router = renderPortal(BUY_PAGE);

    fireEvent.click(await screen.findByRole("button", { name: "Tuesday 1 December" }));
    expect(await screen.findByText("Tue 1 Dec to Thu 10 Dec")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Buy membership/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/memberships/16"));
    const [bought] = requestsTo(fetch, "POST", "/v1/memberships");
    expect(await bought!.json()).toEqual({ planId: plan.id, startsOn: "2026-12-01" });
  });

  it("aRefusal_staysOnThePage", async () => {
    const fetch = api({
      "POST /v1/memberships": failure(
        409,
        "tt_mem_004",
        "This Membership Plan is no longer on sale",
      ),
    });
    const router = renderPortal(BUY_PAGE);

    await screen.findByRole("button", { name: "Today, Saturday 28 November" });
    fireEvent.click(screen.getByRole("button", { name: /Buy membership/ }));

    await waitFor(() => expect(requestsTo(fetch, "POST", "/v1/memberships")).toHaveLength(1));
    expect(router.state.location.pathname).toBe(BUY_PAGE);
  });

  it("aPlanNoLongerOnSale_saysSo", async () => {
    api({
      "GET /v1/membership-plans/8": failure(404, "tt_mem_001", "Membership Plan 8 was not found"),
    });
    renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "This membership isn't on sale" }),
    ).toBeInTheDocument();
  });

  it("payAtVenue_sendsTheCustomerToTheDesk", async () => {
    api({ "GET /v1/venues/3": { ...gym, payAtVenue: true } });
    renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Buy this at the desk" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Buy membership/ })).not.toBeInTheDocument();
  });

  it("oneAlreadyWaitingForPayment_offersToOpenIt", async () => {
    api({ "GET /v1/memberships": page([membership]) });
    renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "This membership is waiting for payment" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open that membership/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/memberships/16"),
    );
    expect(screen.queryByRole("button", { name: /Buy membership/ })).not.toBeInTheDocument();
  });
});

describe("MEM-04 renew", () => {
  it("withAnActiveOne_startsTheDayAfterItEnds", async () => {
    const fetch = api({ "GET /v1/memberships": page([activeUntil14Dec]) });
    renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Renew your membership" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Starts Tue 15 Dec" })).toBeInTheDocument();
    expect(screen.getByText("Tue 15 Dec to Thu 24 Dec")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Today/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Renew membership/ }));

    await waitFor(() => expect(requestsTo(fetch, "POST", "/v1/memberships")).toHaveLength(1));
    const [renewed] = requestsTo(fetch, "POST", "/v1/memberships");
    expect(await renewed!.json()).toEqual({ planId: plan.id, startsOn: "2026-12-15" });
  });

  it("anEndedOne_isNotRenewed_butBoughtFromToday", async () => {
    api({
      "GET /v1/memberships": page([
        { ...activeUntil14Dec, startsOn: "2026-10-01", endsOn: "2026-10-10", status: "ENDED" },
      ]),
    });
    renderPortal(BUY_PAGE);

    expect(
      await screen.findByRole("heading", { name: "Start your membership" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Today, Saturday 28 November" }),
    ).toBeInTheDocument();
  });
});
