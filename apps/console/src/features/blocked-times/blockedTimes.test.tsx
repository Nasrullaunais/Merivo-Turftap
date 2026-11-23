import { fireEvent, screen, waitFor } from "@testing-library/react";
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
const repainting = {
  id: 41,
  resourceId: 11,
  startsAt: "2026-12-25T04:30:00.000Z",
  endsAt: "2026-12-25T06:30:00.000Z",
  reason: "Repainting",
  ...times,
};

function resourcePageAs(role: StaffRole, blocks: object[]) {
  let current = blocks;
  const fetch = mockApi({
    "GET /v1/me": meAs(role),
    "GET /v1/resources/11": court,
    "GET /v1/venues/3": arena,
    "GET /v1/price-rules": page([]),
    "GET /v1/blocked-times": () => ok(page(current)),
    "POST /v1/blocked-times": () => {
      current = [repainting];
      return Response.json({ status: 201, message: "success", data: repainting }, { status: 201 });
    },
    "DELETE /v1/blocked-times/41": () => {
      current = [];
      return ok(null);
    },
  });
  signInForTesting(PHONE);
  renderApp("/resources/11");
  return fetch;
}

const requestsOf = (fetch: ReturnType<typeof mockApi>, method: string) =>
  fetch.mock.calls.map(([request]) => request as Request).filter((r) => r.method === method);
const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("VEN-07 block a resource", () => {
  it("frontDesk_seesUpcomingBlocksInTheVenuesTime", async () => {
    const fetch = resourcePageAs("FRONT_DESK", [repainting]);
    expect(await screen.findByText("Fri, 25 Dec 2026 · 10:00–12:00")).toBeInTheDocument();
    expect(screen.getByText("Repainting")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Unblock/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Block" })).not.toBeInTheDocument();
    const list = requestsOf(fetch, "GET").find((r) => r.url.includes("blocked-times"))!;
    const from = new URL(list.url).searchParams.get("from")!;
    expect(Math.abs(Date.parse(from) - Date.now())).toBeLessThan(60_000);
  });

  it("list_showsBothDaysForABlockPastMidnight", async () => {
    resourcePageAs("FRONT_DESK", [{ ...repainting, endsAt: "2026-12-26T02:30:00.000Z" }]);
    expect(
      await screen.findByText("Fri, 25 Dec 2026 10:00 – Sat, 26 Dec 2026 08:00"),
    ).toBeInTheDocument();
  });

  it("manager_blocksATimeTypedInTheVenuesTime", async () => {
    const fetch = resourcePageAs("MANAGER", []);
    expect(
      await screen.findByText("Times are in the venue's time zone (Asia/Colombo)."),
    ).toBeInTheDocument();
    type(/^From date/, "2026-12-25");
    type(/^From time/, "10:00");
    type(/^To time/, "12:00");
    type(/^Reason/, " Repainting ");
    fireEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(await screen.findByText("Fri, 25 Dec 2026 · 10:00–12:00")).toBeInTheDocument();
    expect(await requestsOf(fetch, "POST")[0]!.clone().json()).toEqual({
      resourceId: 11,
      startsAt: "2026-12-25T04:30:00.000Z",
      endsAt: "2026-12-25T06:30:00.000Z",
      reason: "Repainting",
    });
  });

  it("manager_isToldWhenTheEndIsBeforeTheStart", async () => {
    const fetch = resourcePageAs("MANAGER", []);
    await screen.findByRole("button", { name: "Block" });
    type(/^From date/, "2026-12-25");
    type(/^From time/, "12:00");
    type(/^To time/, "10:00");
    fireEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(await screen.findByText("Must end after it starts")).toBeInTheDocument();
    expect(requestsOf(fetch, "POST")).toHaveLength(0);
  });

  it("manager_isShownWhyTheAPIRefusedTheBlock", async () => {
    const clash = "This overlaps the booking for Nimal Perera at Fri 25 Dec, 10:00";
    signInForTesting(PHONE);
    mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/resources/11": court,
      "GET /v1/venues/3": arena,
      "GET /v1/price-rules": page([]),
      "GET /v1/blocked-times": page([]),
      "POST /v1/blocked-times": () => apiError(409, "tt_ven_014", clash),
    });
    renderApp("/resources/11");
    await screen.findByRole("button", { name: "Block" });
    type(/^From date/, "2026-12-25");
    type(/^From time/, "09:00");
    type(/^To time/, "12:00");
    fireEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(clash);
  });

  it("manager_unblocksATime", async () => {
    const fetch = resourcePageAs("MANAGER", [repainting]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Unblock Fri, 25 Dec 2026 · 10:00–12:00" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Fri, 25 Dec 2026 · 10:00–12:00")).not.toBeInTheDocument(),
    );
    expect(requestsOf(fetch, "DELETE")).toHaveLength(1);
  });
});
