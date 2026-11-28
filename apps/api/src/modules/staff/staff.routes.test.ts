import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";

import { config } from "../../lib/config";
import { db } from "../../lib/db";
import { TURFTAP_NUMBER, WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  asStaff,
  call,
  createTenant,
  type TestStaff,
  type TestTenant,
  uniquePhone,
} from "../../test/fixtures";
import { testPorts } from "../../test/ports";
import { sendStaffInvite } from "./staff.jobs";

const localFormat = (phone: string) => `0${phone.slice("+94".length)}`;

/** Runs the invite job queued for this staff row, as the job worker would. */
async function runQueuedInvite(staffId: number) {
  const { rows } = await db().execute(
    sql`select data from pgboss.job where name = 'staff-invite' and (data->>'staffId')::int = ${staffId}`,
  );
  expect(rows).toHaveLength(1);
  await sendStaffInvite(rows[0]!.data as { tenantId: number; staffId: number });
}

async function staffIdOf(tenant: TestTenant, who: TestStaff): Promise<number> {
  const reply = await call("GET", "/v1/staff?size=100", asStaff(tenant));
  return reply.body.data.content.find((row: { phone: string }) => row.phone === who.phone).id;
}

const invitesTo = (phone: string) =>
  testPorts.messaging.sent.filter((message) => message.to === phone);

describe("SIG-03 invite staff", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("create_addsSomeoneByPhoneWithARole", async () => {
    const phone = uniquePhone();
    const reply = await call("POST", "/v1/staff", asStaff(tenant), {
      phone: localFormat(phone),
      role: "MANAGER",
    });
    expect(reply.status).toBe(201);
    expect(reply.body.data).toMatchObject({ phone, role: "MANAGER", name: null });
  });

  it("create_sendsAWhatsAppInviteWithTheConsoleLinkFromTheTurfTapNumber", async () => {
    const phone = uniquePhone();
    const reply = await call("POST", "/v1/staff", asStaff(tenant), { phone, role: "FRONT_DESK" });
    await runQueuedInvite(reply.body.data.id);
    expect(invitesTo(phone)).toEqual([
      {
        kind: "template",
        from: TURFTAP_NUMBER,
        to: phone,
        template: WHATSAPP_TEMPLATES.staffInvite,
        values: [`Tenant ${tenant.slug}`, "Front Desk", config.consoleUrl],
      },
    ]);
  });

  it("create_letsSomeoneWhoNeverSignedInLandInTheTenantWithThatRole", async () => {
    const phone = uniquePhone();
    await call("POST", "/v1/staff", asStaff(tenant), { phone, role: "MANAGER" });
    const me = await call("GET", "/v1/me", { phone });
    expect(me.body.data.tenants).toEqual([
      expect.objectContaining({ id: tenant.id, role: "MANAGER" }),
    ]);
  });

  it("create_saysWhenTheyAreAlreadyStaff", async () => {
    const reply = await call("POST", "/v1/staff", asStaff(tenant), {
      phone: tenant.manager.phone,
      role: "OWNER",
    });
    expect(reply.status).toBe(409);
    expect(reply.body.code).toBe("tt_stf_002");
    const me = await call("GET", "/v1/me", { phone: tenant.manager.phone });
    expect(me.body.data.tenants).toEqual([expect.objectContaining({ role: "MANAGER" })]);
  });

  it("create_sendsNoInviteWhenTheyAreAlreadyStaff", async () => {
    const phone = uniquePhone();
    const first = await call("POST", "/v1/staff", asStaff(tenant), { phone, role: "MANAGER" });
    await call("POST", "/v1/staff", asStaff(tenant), { phone, role: "MANAGER" });
    await runQueuedInvite(first.body.data.id);
    expect(invitesTo(phone)).toHaveLength(1);
  });

  it("create_isOnlyForOwners", async () => {
    for (const who of [tenant.manager, tenant.frontDesk]) {
      const reply = await call("POST", "/v1/staff", asStaff(tenant, who), {
        phone: uniquePhone(),
        role: "FRONT_DESK",
      });
      expect(reply.status).toBe(403);
    }
  });

  it("create_listsABadPhoneAndRole", async () => {
    const reply = await call("POST", "/v1/staff", asStaff(tenant), { phone: "12", role: "BOSS" });
    expect(reply.status).toBe(400);
    const fields = reply.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["phone", "role"]));
  });

  it("list_showsEachPersonsPhoneAndRoleToOwnersAndManagers", async () => {
    for (const who of [tenant.owner, tenant.manager]) {
      const reply = await call("GET", "/v1/staff?size=100", asStaff(tenant, who));
      expect(reply.status).toBe(200);
      expect(reply.body.data.content).toContainEqual(
        expect.objectContaining({ phone: tenant.owner.phone, role: "OWNER" }),
      );
    }
  });

  it("get_showsOnePerson", async () => {
    const added = await call("POST", "/v1/staff", asStaff(tenant), {
      phone: uniquePhone(),
      role: "MANAGER",
    });
    const reply = await call("GET", `/v1/staff/${added.body.data.id}`, asStaff(tenant));
    expect(reply.body.data).toEqual(added.body.data);
  });
});

describe("SIG-04 change or remove staff", () => {
  let tenant: TestTenant;
  beforeEach(async () => {
    tenant = await createTenant();
  });

  const rolesOf = async (who: TestStaff) =>
    (await call("GET", "/v1/me", { phone: who.phone })).body.data.tenants.map(
      (row: { role: string }) => row.role,
    );

  it("update_changesTheirRole", async () => {
    const id = await staffIdOf(tenant, tenant.manager);
    const reply = await call("PATCH", `/v1/staff/${id}`, asStaff(tenant), { role: "FRONT_DESK" });
    expect(reply.status).toBe(200);
    expect(reply.body.data).toMatchObject({ phone: tenant.manager.phone, role: "FRONT_DESK" });
    expect(await rolesOf(tenant.manager)).toEqual(["FRONT_DESK"]);
  });

  it("update_refusesTheLastOwnerChangingTheirOwnRole", async () => {
    const id = await staffIdOf(tenant, tenant.owner);
    const reply = await call("PATCH", `/v1/staff/${id}`, asStaff(tenant), { role: "MANAGER" });
    expect(reply.status).toBe(409);
    expect(reply.body.code).toBe("tt_stf_003");
    expect(await rolesOf(tenant.owner)).toEqual(["OWNER"]);
  });

  it("update_withNoFieldsLeavesTheLastOwnerAsTheyAre", async () => {
    const reply = await call(
      "PATCH",
      `/v1/staff/${await staffIdOf(tenant, tenant.owner)}`,
      asStaff(tenant),
      {},
    );
    expect(reply.status).toBe(200);
    expect(reply.body.data.role).toBe("OWNER");
  });

  it("update_letsAnOwnerStepDownWhenAnotherOwnerRemains", async () => {
    await call("PATCH", `/v1/staff/${await staffIdOf(tenant, tenant.manager)}`, asStaff(tenant), {
      role: "OWNER",
    });
    const id = await staffIdOf(tenant, tenant.owner);
    const reply = await call("PATCH", `/v1/staff/${id}`, asStaff(tenant), { role: "MANAGER" });
    expect(reply.status).toBe(200);
    expect(await rolesOf(tenant.owner)).toEqual(["MANAGER"]);
  });

  it("remove_takesAwayTheirAccessToTheTenant", async () => {
    const id = await staffIdOf(tenant, tenant.manager);
    expect((await call("DELETE", `/v1/staff/${id}`, asStaff(tenant))).status).toBe(200);
    expect((await call("GET", "/v1/staff", asStaff(tenant, tenant.manager))).status).toBe(403);
    expect(await rolesOf(tenant.manager)).toEqual([]);
  });

  it("remove_refusesTheLastOwnerRemovingThemselves", async () => {
    const reply = await call(
      "DELETE",
      `/v1/staff/${await staffIdOf(tenant, tenant.owner)}`,
      asStaff(tenant),
    );
    expect(reply.status).toBe(409);
    expect(reply.body.code).toBe("tt_stf_003");
    expect(await rolesOf(tenant.owner)).toEqual(["OWNER"]);
  });

  it("remove_leavesOneOwnerWhenTwoOwnersRemoveEachOtherAtOnce", async () => {
    const managerId = await staffIdOf(tenant, tenant.manager);
    await call("PATCH", `/v1/staff/${managerId}`, asStaff(tenant), { role: "OWNER" });
    const ownerId = await staffIdOf(tenant, tenant.owner);
    const replies = await Promise.all([
      call("DELETE", `/v1/staff/${managerId}`, asStaff(tenant, tenant.owner)),
      call("DELETE", `/v1/staff/${ownerId}`, asStaff(tenant, tenant.manager)),
    ]);
    // The loser is refused as the last Owner, or as no longer staff if the other removal landed first.
    const [won, refused] = replies.map((reply) => reply.status).sort();
    expect(won).toBe(200);
    expect([403, 409]).toContain(refused!);
    const { rows } = await db().execute(
      sql`select id from staff where tenant_id = ${tenant.id} and role = 'OWNER'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("updateAndRemove_areOnlyForOwners", async () => {
    const id = await staffIdOf(tenant, tenant.frontDesk);
    for (const who of [tenant.manager, tenant.frontDesk]) {
      const as = asStaff(tenant, who);
      expect((await call("PATCH", `/v1/staff/${id}`, as, { role: "MANAGER" })).status).toBe(403);
      expect((await call("DELETE", `/v1/staff/${id}`, as)).status).toBe(403);
    }
    expect(await rolesOf(tenant.frontDesk)).toEqual(["FRONT_DESK"]);
  });

  it("updateAndRemove_replyNotFoundForAnUnknownId", async () => {
    const missing = 999_999_999;
    const patch = await call("PATCH", `/v1/staff/${missing}`, asStaff(tenant), { role: "OWNER" });
    const removal = await call("DELETE", `/v1/staff/${missing}`, asStaff(tenant));
    for (const reply of [patch, removal]) {
      expect(reply.status).toBe(404);
      expect(reply.body.code).toBe("tt_stf_001");
    }
  });
});

describe("SIG-05 what each role can do with staff", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("listAndGet_refuseFrontDesk", async () => {
    const as = asStaff(tenant, tenant.frontDesk);
    const list = await call("GET", "/v1/staff", as);
    const one = await call("GET", `/v1/staff/${await staffIdOf(tenant, tenant.owner)}`, as);
    for (const reply of [list, one]) {
      expect(reply.status).toBe(403);
      expect(reply.body.code).toBe("tt_htt_403");
    }
  });
});
