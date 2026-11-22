import { beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../lib/db";
import { staff } from "../staff/staff.tables";
import { call, createTenant, type TestTenant, uniquePhone } from "../../test/fixtures";
import { users } from "./platform.tables";

describe("SIG-02 GET /v1/me", () => {
  let first: TestTenant;
  let second: TestTenant;

  beforeAll(async () => {
    first = await createTenant();
    second = await createTenant();
    await db()
      .insert(staff)
      .values({ tenantId: second.id, userId: first.owner.userId, role: "FRONT_DESK" });
  });

  it("me_listsEveryTenantTheUserIsStaffAtWithTheirRole", async () => {
    const reply = await call("GET", "/v1/me", { phone: first.owner.phone });
    expect(reply.status).toBe(200);
    expect(reply.body.data).toMatchObject({
      phone: first.owner.phone,
      isPlatformAdmin: false,
    });
    expect(reply.body.data.tenants).toEqual(
      expect.arrayContaining([
        { id: first.id, slug: first.slug, name: `Tenant ${first.slug}`, role: "OWNER" },
        { id: second.id, slug: second.slug, name: `Tenant ${second.slug}`, role: "FRONT_DESK" },
      ]),
    );
    expect(reply.body.data.tenants).toHaveLength(2);
  });

  it("me_listsNoTenantsForSomeoneWhoIsNotStaffAnywhere", async () => {
    const reply = await call("GET", "/v1/me", { phone: uniquePhone() });
    expect(reply.status).toBe(200);
    expect(reply.body.data.tenants).toEqual([]);
  });

  it("me_marksAPlatformAdmin", async () => {
    const phone = uniquePhone();
    await call("GET", "/v1/me", { phone });
    await db().update(users).set({ isPlatformAdmin: true }).where(eq(users.phone, phone));
    expect((await call("GET", "/v1/me", { phone })).body.data.isPlatformAdmin).toBe(true);
  });

  it("me_refusesSomeoneNotSignedIn", async () => {
    const reply = await call("GET", "/v1/me");
    expect(reply.status).toBe(401);
    expect(reply.body.code).toBe("tt_htt_401");
  });

  it("me_worksWithoutATenantHeader", async () => {
    const reply = await call("GET", "/v1/me", { phone: first.manager.phone });
    expect(reply.body.data.tenants).toEqual([
      expect.objectContaining({ id: first.id, role: "MANAGER" }),
    ]);
  });
});
