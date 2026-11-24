import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  planInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

describe("membership-plans tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let venueOfB: number;
  let planOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data.id;
    planOfB = (await call("POST", "/v1/membership-plans", asStaff(tenantB), planInput(venueOfB)))
      .body.data.id;
  });

  it("create_cannotAddAPlanToAnotherTenantsVenue", async () => {
    const reply = await call("POST", "/v1/membership-plans", asStaff(tenantA), planInput(venueOfB));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
  });

  it("get_repliesNotFoundForAnotherTenantsPlan", async () => {
    const reply = await call("GET", `/v1/membership-plans/${planOfB}`, asStaff(tenantA));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_mem_001" } });
  });

  it("get_repliesNotFoundForAnotherTenantsPlanOnThePublicPortal", async () => {
    const reply = await call("GET", `/v1/membership-plans/${planOfB}`, {
      tenantSlug: tenantA.slug,
    });
    expect(reply.status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsPlans", async () => {
    const reply = await call("GET", `/v1/membership-plans?venueId=${venueOfB}`, asStaff(tenantA));
    expect(reply.body.data.content).toEqual([]);
    const all = await call("GET", "/v1/membership-plans", { tenantSlug: tenantA.slug });
    expect(all.body.data.content).toEqual([]);
  });

  it("update_cannotChangeAnotherTenantsPlan", async () => {
    const path = `/v1/membership-plans/${planOfB}`;
    expect((await call("PATCH", path, asStaff(tenantA), { name: "Taken" })).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.name).not.toBe("Taken");
  });

  it("delete_cannotTurnOffAnotherTenantsPlan", async () => {
    const path = `/v1/membership-plans/${planOfB}`;
    expect((await call("DELETE", path, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.active).toBe(true);
  });
});
