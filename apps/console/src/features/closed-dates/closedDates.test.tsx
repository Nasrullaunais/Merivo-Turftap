import { fireEvent, screen, waitFor } from "@testing-library/react";
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
  openingHours: [],
  active: true,
  ...times,
};
const christmas = { id: 31, venueId: 3, date: "2026-12-25", reason: "Christmas", ...times };

const requestsOf = (fetch: ReturnType<typeof mockApi>, method: string) =>
  fetch.mock.calls.map(([request]) => request as Request).filter((r) => r.method === method);

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

  it("manager_closesADateWithAReason", async () => {
    signInForTesting(PHONE);
    let closed: object[] = [];
    const fetch = mockApi({
      "GET /v1/me": meAs("MANAGER"),
      "GET /v1/venues/3": arena,
      "GET /v1/resources": page([]),
      "GET /v1/closed-dates": () => ok(page(closed)),
      "POST /v1/closed-dates": () => {
        closed = [christmas];
        return Response.json({ status: 201, message: "success", data: christmas }, { status: 201 });
      },
    });
    renderApp("/venues/3");
    expect(
      await screen.findByText(
        "No upcoming Closed Dates. The venue follows its opening hours every day.",
      ),
    ).toBeInTheDocument();
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
});
