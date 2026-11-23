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
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
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
  openingHours: [{ weekday: 1, opens: "06:00", closes: "22:00" }],
  active: true,
  createdAt: "2026-11-22T04:00:00.000Z",
  updatedAt: "2026-11-22T04:00:00.000Z",
};

function fillVenue(fields: { name: string; address: string; phone: string }) {
  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: fields.name } });
  fireEvent.change(screen.getByLabelText(/^Address/), { target: { value: fields.address } });
  fireEvent.change(screen.getByLabelText(/^Phone number/), { target: { value: fields.phone } });
}
const save = () => fireEvent.click(screen.getByRole("button", { name: "Add venue" }));
const postBodies = (fetch: ReturnType<typeof mockApi>) =>
  fetch.mock.calls.filter(([request]) => (request as Request).method === "POST");

describe("VEN-01 add a venue from the Staff Console", () => {
  it("owner_addsAVenueWithDifferentHoursEachDay", async () => {
    signInForTesting(PHONE);
    const sent: unknown[] = [];
    let venues: object[] = [];
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/venues": () =>
        Response.json({ status: 200, message: "success", data: page(venues) }),
      "POST /v1/venues": async (request: Request) => {
        sent.push(await request.json());
        venues = [arena];
        return Response.json({ status: 201, message: "success", data: arena }, { status: 201 });
      },
    });
    renderApp("/venues");
    await screen.findByRole("heading", { name: "Add a venue" });

    fillVenue({ name: "City Arena", address: "12 Galle Road, Colombo", phone: "011 234 5678" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Open on Sunday" }));
    fireEvent.change(screen.getByLabelText("Saturday closes"), { target: { value: "23:30" } });
    save();

    expect(await screen.findByText("City Arena")).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    const body = sent[0] as { openingHours: { weekday: number; closes: string }[] };
    expect(body).toMatchObject({
      name: "City Arena",
      address: "12 Galle Road, Colombo",
      phone: "011 234 5678",
    });
    expect(body.openingHours.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(body.openingHours.find((day) => day.weekday === 6)?.closes).toBe("23:30");
  });

  it("owner_isToldTheNameIsTaken", async () => {
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("OWNER"),
      "GET /v1/venues": page([arena]),
      "POST /v1/venues": () => apiError(409, "tt_ven_002", "Another venue already has this name"),
    });
    renderApp("/venues");
    await screen.findByText("City Arena");
    fillVenue({ name: "city arena", address: "Somewhere", phone: "011 234 5678" });
    save();
    expect(await screen.findByText("Another venue already has this name")).toBeInTheDocument();
  });

  it("addVenue_refusesADayThatClosesBeforeItOpens", async () => {
    signInForTesting(PHONE);
    const fetch = mockApi({ "GET /v1/me": meAs("OWNER"), "GET /v1/venues": page([]) });
    renderApp("/venues");
    await screen.findByRole("heading", { name: "Add a venue" });
    fillVenue({ name: "Night Court", address: "Kandy", phone: "011 234 5678" });
    fireEvent.change(screen.getByLabelText("Monday closes"), { target: { value: "05:00" } });
    save();
    expect(await screen.findByText("Must close after it opens")).toBeInTheDocument();
    expect(postBodies(fetch)).toHaveLength(0);
  });

  it.each(["MANAGER", "FRONT_DESK"] as const)("%s_seesTheVenuesButCannotAddOne", async (role) => {
    signInForTesting(PHONE);
    mockApi({ "GET /v1/me": meAs(role), "GET /v1/venues": page([arena]) });
    renderApp("/venues");
    expect(await screen.findByText("City Arena")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add a venue" })).not.toBeInTheDocument();
  });

  it("everyStaffRole_seesTheVenuesLink", async () => {
    signInForTesting(PHONE);
    mockApi({ "GET /v1/me": meAs("FRONT_DESK"), "GET /v1/venues": page([]) });
    renderApp("/");
    const banner = await screen.findByRole("banner");
    fireEvent.click(within(banner).getByRole("link", { name: "Venues" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Venues" })).toBeInTheDocument(),
    );
  });
});
