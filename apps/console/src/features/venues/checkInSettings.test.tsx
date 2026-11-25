import { fireEvent, screen } from "@testing-library/react";
import type { StaffRole } from "@turftap/contract";
import { describe, expect, it } from "vitest";

import { signInForTesting } from "../../lib/auth/session";
import { mockApi } from "../../test/mockApi";
import { renderApp } from "../../test/renderApp";
import { myTenant } from "../../test/tenants";

const PHONE = "+94771234567";
const ok = (data: unknown) => Response.json({ status: 200, message: "success", data });
const page = (content: object[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const gym = {
  id: 3,
  name: "Kandy Fitness",
  description: null,
  address: "5 Peradeniya Road, Kandy",
  phone: "+94812345678",
  timeZone: "Asia/Colombo",
  bankAccount: null,
  advancePercent: 100,
  paymentTimeLimitMinutes: 20,
  cancellationCutOffHours: 6,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  repeatCheckIns: true,
  openingHours: [],
  active: true,
  createdAt: "2026-11-22T04:00:00.000Z",
  updatedAt: "2026-11-22T04:00:00.000Z",
};

function venuePageAs(role: StaffRole) {
  let current = gym;
  const patches: unknown[] = [];
  mockApi({
    "GET /v1/me": {
      id: 1,
      phone: PHONE,
      name: "Demo",
      isPlatformAdmin: false,
      tenants: [myTenant({ id: 1, slug: "demo", name: "Demo Sports", role })],
    },
    "GET /v1/venues/3": () => ok(current),
    "GET /v1/resources": page([]),
    "GET /v1/closed-dates": page([]),
    "PATCH /v1/venues/3": async (request: Request) => {
      const body = await request.json();
      patches.push(body);
      current = { ...current, ...body };
      return ok(current);
    },
  });
  signInForTesting(PHONE);
  renderApp("/venues/3");
  return patches;
}

describe("MEM-05 check-in setting on the venue", () => {
  it("owner_turnsOffRepeatCheckIns_andItSavesAtOnce", async () => {
    const patches = venuePageAs("OWNER");

    fireEvent.click(
      await screen.findByRole("switch", { name: "Allow more than one check-in a day" }),
    );

    expect(
      await screen.findByText("A membership can be checked in once a day."),
    ).toBeInTheDocument();
    expect(patches).toEqual([{ repeatCheckIns: false }]);
  });

  it("frontDesk_seesTheRuleButCannotChangeIt", async () => {
    venuePageAs("FRONT_DESK");

    expect(
      await screen.findByText("A membership can be checked in more than once a day."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Allow more than one check-in a day" })).toBeNull();
  });
});
