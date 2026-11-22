import { beforeAll, describe, expect, it } from "bun:test";

import { asStaff, call, createTenant, type TestTenant, uniquePhone } from "../../test/fixtures";

describe("staff tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let staffOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const added = await call("POST", "/v1/staff", asStaff(tenantB), {
      phone: uniquePhone(),
      role: "MANAGER",
    });
    staffOfB = added.body.data.id;
  });

  it("get_repliesNotFoundForAnotherTenantsStaff", async () => {
    expect((await call("GET", `/v1/staff/${staffOfB}`, asStaff(tenantA))).status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsStaff", async () => {
    const reply = await call("GET", "/v1/staff?size=100&sort=createdAt,desc", asStaff(tenantA));
    const phones = reply.body.data.content.map((row: { phone: string }) => row.phone);
    expect(phones).not.toContain(tenantB.owner.phone);
    expect(reply.body.data.content.map((row: { id: number }) => row.id)).not.toContain(staffOfB);
  });

  it("updateAndRemove_replyNotFoundForAnotherTenantsStaff", async () => {
    const as = asStaff(tenantA);
    expect((await call("PATCH", `/v1/staff/${staffOfB}`, as, { role: "OWNER" })).status).toBe(404);
    expect((await call("DELETE", `/v1/staff/${staffOfB}`, as)).status).toBe(404);
    const stillThere = await call("GET", `/v1/staff/${staffOfB}`, asStaff(tenantB));
    expect(stillThere.body.data.role).toBe("MANAGER");
  });

  it("create_addsToTheCallersOwnTenantOnly", async () => {
    const phone = uniquePhone();
    await call("POST", "/v1/staff", asStaff(tenantA), { phone, role: "OWNER" });
    const me = await call("GET", "/v1/me", { phone });
    expect(me.body.data.tenants.map((tenant: { id: number }) => tenant.id)).toEqual([tenantA.id]);
  });
});
