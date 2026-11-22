import { beforeAll, describe, expect, it } from "bun:test";

import { todayIn } from "../../lib/time";
import { asStaff, call, createTenant, type TestTenant, venueInput } from "../../test/fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;
const nextWeek = () => todayIn("Asia/Colombo", new Date(Date.now() + 7 * DAY_MS));

describe("Closed Dates tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let venueOfB: number;
  let closedOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data.id;
    closedOfB = (
      await call("POST", "/v1/closed-dates", asStaff(tenantB), {
        venueId: venueOfB,
        date: nextWeek(),
      })
    ).body.data.id;
  });

  it("create_cannotCloseAnotherTenantsVenue", async () => {
    const reply = await call("POST", "/v1/closed-dates", asStaff(tenantA), {
      venueId: venueOfB,
      date: nextWeek(),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
  });

  it("get_repliesNotFoundForAnotherTenantsClosedDate", async () => {
    const reply = await call("GET", `/v1/closed-dates/${closedOfB}`, asStaff(tenantA));
    expect(reply.status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsClosedDates", async () => {
    const reply = await call("GET", `/v1/closed-dates?venueId=${venueOfB}`, asStaff(tenantA));
    expect(reply.body.data.content).toEqual([]);
  });

  it("update_cannotChangeAnotherTenantsClosedDate", async () => {
    const path = `/v1/closed-dates/${closedOfB}`;
    expect((await call("PATCH", path, asStaff(tenantA), { reason: "Taken" })).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.reason).toBeNull();
  });

  it("delete_cannotReopenAnotherTenantsClosedDate", async () => {
    const path = `/v1/closed-dates/${closedOfB}`;
    expect((await call("DELETE", path, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).status).toBe(200);
  });
});
