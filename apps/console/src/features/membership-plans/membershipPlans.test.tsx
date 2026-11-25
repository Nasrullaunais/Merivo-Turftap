import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { apiError, mockApi } from "../../test/mockApi";
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
const venue = (id: number, name: string) => ({
  id,
  name,
  description: null,
  address: "12 Galle Road, Colombo",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 100,
  paymentTimeLimitMinutes: 20,
  cancellationCutOffHours: 6,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  hasGym: true,
  openingHours: [],
  active: true,
  ...times,
});
const arena = venue(3, "City Arena");
const gym = venue(4, "Kandy Fitness");
const poolHall = { ...venue(5, "Cue Club"), hasGym: false };
const monthly = {
  id: 21,
  venueId: 3,
  name: "Gym monthly",
  lengthCount: 1,
  lengthUnit: "MONTHS",
  price: { amount: 500_000, currency: "LKR" },
  active: true,
  ...times,
};
const tenDays = {
  ...monthly,
  id: 22,
  venueId: 4,
  name: "10-day pass",
  lengthCount: 10,
  lengthUnit: "DAYS",
  price: { amount: 200_000, currency: "LKR" },
};

const sectionOf = (venueName: string) =>
  screen.getByRole("heading", { name: venueName }).closest("section")!;

describe("MEM-01 Membership Plans", () => {
  it("plans_showUnderTheirVenueWithLengthAndPrice", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena, gym]),
      "GET /v1/membership-plans": page([monthly, tenDays]),
    });
    renderApp("/membership-plans");
    const card = await screen.findByRole("article", { name: "Gym monthly" });
    expect(sectionOf("City Arena")).toContainElement(card);
    expect(within(card).getByText("1 month")).toBeInTheDocument();
    expect(within(card).getByText("LKR 5,000")).toBeInTheDocument();
    const pass = within(sectionOf("Kandy Fitness")).getByRole("article", { name: "10-day pass" });
    expect(within(pass).getByText("10 days")).toBeInTheDocument();
  });

  it("venuesWithoutAGym_areLeftOut", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([gym, poolHall]),
      "GET /v1/membership-plans": page([tenDays]),
    });
    renderApp("/membership-plans");
    expect(await screen.findByRole("article", { name: "10-day pass" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cue Club" })).toBeNull();
  });

  it("noVenueWithAGym_saysHowToTurnOneOn", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([poolHall]),
      "GET /v1/membership-plans": page([]),
    });
    renderApp("/membership-plans");
    expect(await screen.findByText(/No venue has a gym yet/)).toBeInTheDocument();
  });

  it("manager_addsATenDayPlanFromTheVenuesOwnAddCard", async () => {
    signInForTesting(PHONE);
    const sent: unknown[] = [];
    let plans: object[] = [monthly];
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena, gym]),
      "GET /v1/membership-plans": () => ok(page(plans)),
      "POST /v1/membership-plans": async (request: Request) => {
        sent.push(await request.json());
        plans = [monthly, tenDays];
        return Response.json({ status: 201, message: "success", data: tenDays }, { status: 201 });
      },
    });
    renderApp("/membership-plans");
    await screen.findByRole("article", { name: "Gym monthly" });
    fireEvent.click(within(sectionOf("Kandy Fitness")).getByRole("button", { name: "Add a plan" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: "Kandy Fitness" })).toBeChecked();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: "10-day pass" },
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^Length/ }), {
      target: { value: "10" },
    });
    fireEvent.click(within(dialog).getByRole("radio", { name: "Days" }));
    fireEvent.change(within(dialog).getByLabelText(/^Price/), { target: { value: "2000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add plan" }));

    await waitFor(() =>
      expect(within(sectionOf("Kandy Fitness")).getByText("10-day pass")).toBeInTheDocument(),
    );
    expect(sent).toEqual([
      {
        venueId: 4,
        name: "10-day pass",
        lengthCount: 10,
        lengthUnit: "DAYS",
        price: { amount: 200_000, currency: "LKR" },
      },
    ]);
  });

  it("addPlan_refusesMoreMonthsThanAPlanMayLast", async () => {
    signInForTesting(PHONE);
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena]),
      "GET /v1/membership-plans": page([]),
    });
    renderApp("/membership-plans");
    fireEvent.click((await screen.findAllByRole("button", { name: "Add a plan" }))[0]!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("radiogroup", { name: "Venue" })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "Forever" } });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^Length/ }), {
      target: { value: "30" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Price/), { target: { value: "9000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add plan" }));

    expect(
      await within(dialog).findByText("Must be a whole number from 1 to 24 months"),
    ).toBeInTheDocument();
    const posts = fetch.mock.calls.filter(([request]) => (request as Request).method === "POST");
    expect(posts).toHaveLength(0);
  });

  it("manager_isToldTheNameIsTaken", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena]),
      "GET /v1/membership-plans": page([monthly]),
      "POST /v1/membership-plans": () =>
        apiError(409, "tt_mem_002", "Another Membership Plan at this venue already has this name"),
    });
    renderApp("/membership-plans");
    await screen.findByRole("article", { name: "Gym monthly" });
    fireEvent.click(screen.getAllByRole("button", { name: "Add a plan" })[0]!);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: "gym monthly" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Price/), { target: { value: "5000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add plan" }));
    expect(
      await screen.findByText("Another Membership Plan at this venue already has this name"),
    ).toBeInTheDocument();
  });

  it("manager_turnsOffAPlanOnlyAfterConfirming", async () => {
    signInForTesting(PHONE);
    let plans: object[] = [monthly];
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena]),
      "GET /v1/membership-plans": () => ok(page(plans)),
      "DELETE /v1/membership-plans/21": () => {
        plans = [{ ...monthly, active: false }];
        return ok(null);
      },
    });
    const deletes = () =>
      fetch.mock.calls.filter(([request]) => (request as Request).method === "DELETE");
    renderApp("/membership-plans");

    fireEvent.click(await screen.findByRole("button", { name: "Turn off Gym monthly" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep it" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Keep it" })).toBeNull());
    expect(deletes()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Turn off Gym monthly" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Turn off Gym monthly?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn off" }));
    const card = await screen.findByRole("article", { name: "Gym monthly" });
    await waitFor(() => expect(within(card).getByText("Turned off")).toBeInTheDocument());
    expect(deletes()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Turn off Gym monthly" })).toBeNull();
  });

  it("turnedOffTile_showsOnlyPlansNoLongerOnSale", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena, gym]),
      "GET /v1/membership-plans": page([monthly, { ...tenDays, active: false }]),
    });
    renderApp("/membership-plans");
    await screen.findByRole("article", { name: "Gym monthly" });
    fireEvent.click(screen.getByRole("button", { name: /^Turned off/ }));

    expect(screen.queryByRole("article", { name: "Gym monthly" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "City Arena" })).toBeNull();
    expect(screen.getByRole("article", { name: "10-day pass" })).toBeInTheDocument();
  });

  it("frontDesk_seesThePlansButCannotAddOrTurnOff", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("FRONT_DESK"),
      "GET /v1/venues": page([arena]),
      "GET /v1/membership-plans": page([monthly]),
    });
    renderApp("/membership-plans");
    await screen.findByRole("article", { name: "Gym monthly" });
    expect(screen.queryByRole("button", { name: "Add a plan" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Turn off Gym monthly" })).toBeNull();
  });
});
