import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  planInput,
  type TestTenant,
  uniquePhone,
  gymInput,
} from "../../test/fixtures";

describe("check-ins tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let membershipOfB: number;
  let checkInOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venue = (await call("POST", "/v1/venues", asStaff(tenantB), gymInput())).body.data;
    const plan = (await call("POST", "/v1/membership-plans", asStaff(tenantB), planInput(venue.id)))
      .body.data;
    membershipOfB = (
      await call("POST", "/v1/memberships", asStaff(tenantB), {
        planId: plan.id,
        walkIn: { customerName: "Nimal", customerPhone: uniquePhone(), payment: "CASH" },
      })
    ).body.data.id;
    checkInOfB = (
      await call("POST", "/v1/check-ins", asStaff(tenantB), { membershipId: membershipOfB })
    ).body.data.id;
  });

  it("checkIns_anotherTenantsAreNeverSeenOrTouched", async () => {
    const as = asStaff(tenantA);
    expect(await call("POST", "/v1/check-ins", as, { membershipId: membershipOfB })).toMatchObject({
      status: 404,
      body: { code: "tt_mem_003" },
    });
    expect(
      (await call("GET", `/v1/check-ins?membershipId=${membershipOfB}`, as)).body.data.content,
    ).toEqual([]);
    expect((await call("GET", `/v1/check-ins/${checkInOfB}`, as)).status).toBe(404);
    expect((await call("DELETE", `/v1/check-ins/${checkInOfB}`, as)).status).toBe(404);
    expect((await call("GET", `/v1/check-ins/${checkInOfB}`, asStaff(tenantB))).status).toBe(200);
  });
});
