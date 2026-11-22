import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  priceRuleInput,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

describe("price-rules tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let resourceOfB: number;
  let ruleOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data
      .id;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venueOfB)))
      .body.data.id;
    ruleOfB = (await call("POST", "/v1/price-rules", asStaff(tenantB), priceRuleInput(resourceOfB)))
      .body.data.id;
  });

  it("create_cannotAddARuleToAnotherTenantsResource", async () => {
    const reply = await call(
      "POST",
      "/v1/price-rules",
      asStaff(tenantA),
      priceRuleInput(resourceOfB, { weekdays: [1] }),
    );
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("get_repliesNotFoundForAnotherTenantsRule", async () => {
    expect((await call("GET", `/v1/price-rules/${ruleOfB}`, asStaff(tenantA))).status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsRules", async () => {
    const reply = await call("GET", `/v1/price-rules?resourceId=${resourceOfB}`, {
      tenantSlug: tenantA.slug,
    });
    expect(reply.body.data.content).toEqual([]);
  });

  it("update_cannotChangeAnotherTenantsRule", async () => {
    const path = `/v1/price-rules/${ruleOfB}`;
    const price = { amount: 100, currency: "LKR" };
    expect((await call("PATCH", path, asStaff(tenantA), { price })).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.price.amount).toBe(400_000);
  });

  it("delete_cannotRemoveAnotherTenantsRule", async () => {
    const path = `/v1/price-rules/${ruleOfB}`;
    expect((await call("DELETE", path, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).status).toBe(200);
  });
});
