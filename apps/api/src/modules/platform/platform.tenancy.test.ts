import { beforeAll, describe, expect, it } from "bun:test";

import { call, createTenant, type TestTenant } from "../../test/fixtures";

describe("platform tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
  });

  it("me_neverListsATenantTheUserIsNotStaffAt", async () => {
    const reply = await call("GET", "/v1/me", { phone: tenantA.owner.phone });
    const ids = reply.body.data.tenants.map((tenant: { id: number }) => tenant.id);
    expect(ids).toEqual([tenantA.id]);
    expect(ids).not.toContain(tenantB.id);
  });
});
