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
  openingHours: [],
  active: true,
  ...times,
};
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
const table = {
  ...court,
  id: 12,
  name: "Pool Table 3",
  type: "POOL_TABLE",
  slotMinutes: 30,
  startIntervalMinutes: 15,
  price: { amount: 60_000, currency: "LKR" },
};

const choiceIn = (group: string) => (name: string) =>
  within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", { name });
const slotChoice = choiceIn("Slot length");
const intervalChoice = choiceIn("Bookings start every");

describe("VEN-04 add resources to a venue", () => {
  it("venueName_opensItsResources", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues": page([arena]),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([court]),
    });
    renderApp("/venues");
    fireEvent.click(await screen.findByRole("link", { name: "City Arena" }));
    expect(await screen.findByRole("heading", { name: "City Arena" })).toBeInTheDocument();
    expect(await screen.findByText("Court 1")).toBeInTheDocument();
    expect(
      screen.getByText("Futsal court · 60 min slots, starting every 30 min · LKR 4,500 per slot"),
    ).toBeInTheDocument();
  });

  it("manager_addsAPoolTableWithHalfHourSlots", async () => {
    signInForTesting(PHONE);
    const sent: unknown[] = [];
    let resources: object[] = [court];
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": () => ok(page(resources)),
      "POST /v1/resources": async (request: Request) => {
        sent.push(await request.json());
        resources = [court, table];
        return Response.json({ status: 201, message: "success", data: table }, { status: 201 });
      },
    });
    renderApp("/venues/3");
    await screen.findByText("Court 1");
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Pool Table 3" } });
    fireEvent.click(screen.getByRole("radio", { name: "Pool table" }));
    fireEvent.click(slotChoice("30 minutes"));
    fireEvent.click(intervalChoice("15 minutes"));
    fireEvent.change(screen.getByLabelText(/^Price per slot/), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "Add resource" }));

    expect(await screen.findByText("Pool Table 3")).toBeInTheDocument();
    expect(sent).toEqual([
      {
        venueId: 3,
        name: "Pool Table 3",
        type: "POOL_TABLE",
        slotMinutes: 30,
        startIntervalMinutes: 15,
        price: { amount: 60_000, currency: "LKR" },
      },
    ]);
    const listed = fetch.mock.calls
      .map(([request]) => new URL((request as Request).url))
      .filter((url) => url.pathname === "/v1/resources" && url.search);
    expect(listed.every((url) => url.searchParams.get("venueId") === "3")).toBe(true);
  });

  it("addResource_neverStartsBookingsLessOftenThanOneSlot", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([]),
    });
    renderApp("/venues/3");
    await screen.findByRole("heading", { name: "Add a resource" });
    expect(slotChoice("60 minutes")).toBeChecked();
    expect(intervalChoice("30 minutes")).toBeChecked();

    fireEvent.click(slotChoice("15 minutes"));
    expect(intervalChoice("15 minutes")).toBeChecked();
    expect(intervalChoice("30 minutes")).toBeDisabled();
    expect(intervalChoice("60 minutes")).toBeDisabled();
  });

  it("manager_isToldTheNameIsTaken", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([court]),
      "POST /v1/resources": () =>
        apiError(409, "tt_ven_004", "Another resource at this venue already has this name"),
    });
    renderApp("/venues/3");
    await screen.findByText("Court 1");
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "court 1" } });
    fireEvent.change(screen.getByLabelText(/^Price per slot/), { target: { value: "4500" } });
    fireEvent.click(screen.getByRole("button", { name: "Add resource" }));
    expect(
      await screen.findByText("Another resource at this venue already has this name"),
    ).toBeInTheDocument();
  });

  it("manager_turnsOffAResourceOnlyAfterConfirming", async () => {
    signInForTesting(PHONE);
    let resources: object[] = [court];
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": () => ok(page(resources)),
      "DELETE /v1/resources/11": () => {
        resources = [{ ...court, active: false }];
        return ok(null);
      },
    });
    const deletes = () =>
      fetch.mock.calls.filter(([request]) => (request as Request).method === "DELETE");
    renderApp("/venues/3");

    fireEvent.click(await screen.findByRole("button", { name: "Turn off Court 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull());
    expect(deletes()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Turn off Court 1" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Turn off Court 1?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn off" }));
    expect(await screen.findByText("Turned off")).toBeInTheDocument();
    expect(deletes()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Turn off Court 1" })).not.toBeInTheDocument();
  });

  it("frontDesk_seesTheResourcesButCannotChangeThem", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("FRONT_DESK"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([court]),
    });
    renderApp("/venues/3");
    expect(await screen.findByText("Court 1")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add a resource" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Turn off/ })).not.toBeInTheDocument();
  });
});
