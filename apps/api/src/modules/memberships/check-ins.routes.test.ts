import { beforeAll, describe, expect, it } from "bun:test";

import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  planInput,
  type TestTenant,
  uniquePhone,
  gymInput,
} from "../../test/fixtures";

describe("MEM-05 check-ins routes", () => {
  let tenant: TestTenant;
  let venueId: number;
  let planId: number;

  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), gymInput())).body.data.id;
    planId = (await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId))).body
      .data.id;
  });

  async function sold(payment: "CASH" | "PAY_LATER" = "CASH") {
    const phone = uniquePhone();
    const reply = await call("POST", "/v1/memberships", asStaff(tenant, tenant.frontDesk), {
      planId,
      walkIn: { customerName: "Nimal", customerPhone: phone, payment },
    });
    return { id: reply.body.data.id as number, phone };
  }

  it("create_frontDeskChecksIn_andTheReplyUsesTheEnvelope", async () => {
    const membership = await sold();

    const reply = await call("POST", "/v1/check-ins", asStaff(tenant, tenant.frontDesk), {
      membershipId: membership.id,
    });

    expect(reply).toMatchObject({
      status: 201,
      body: {
        status: 201,
        message: "success",
        data: { membershipId: membership.id, venueId, customerName: "Nimal" },
      },
    });
    expect(reply.body.data.checkedInAt).toMatch(/Z$/);
  });

  it("create_refusalSaysWhyWithItsCode", async () => {
    const membership = await sold("PAY_LATER");

    const reply = await call("POST", "/v1/check-ins", asStaff(tenant, tenant.frontDesk), {
      membershipId: membership.id,
    });

    expect(reply).toMatchObject({
      status: 409,
      body: { code: "tt_mem_012", message: expect.stringContaining("Balance") },
    });
  });

  it("list_filtersByVenueAndDay_newestFirst", async () => {
    const membership = await sold();
    const as = asStaff(tenant, tenant.manager);
    const first = await call("POST", "/v1/check-ins", as, { membershipId: membership.id });
    const second = await call("POST", "/v1/check-ins", as, { membershipId: membership.id });
    const day = first.body.data.checkedInOn as string;

    const reply = await call(
      "GET",
      `/v1/check-ins?venueId=${venueId}&on=${day}&membershipId=${membership.id}`,
      as,
    );

    expect(reply.body.data.content.map((row: { id: number }) => row.id)).toEqual([
      second.body.data.id,
      first.body.data.id,
    ]);
  });

  it("delete_frontDeskUndoesARecentCheckIn", async () => {
    const membership = await sold();
    const as = asStaff(tenant, tenant.frontDesk);
    const created = await call("POST", "/v1/check-ins", as, { membershipId: membership.id });

    const reply = await call("DELETE", `/v1/check-ins/${created.body.data.id}`, as);

    expect(reply.status).toBe(200);
    const gone = await call("GET", `/v1/check-ins/${created.body.data.id}`, as);
    expect(gone).toMatchObject({ status: 404, body: { code: "tt_mem_017" } });
  });

  it("checkIns_customersAndTheAssistantCannotUseThem", async () => {
    const membership = await sold();
    const callers = [asCustomer(tenant, membership.phone), asAssistant(tenant, membership.phone)];
    for (const as of callers) {
      const created = await call("POST", "/v1/check-ins", as, { membershipId: membership.id });
      const listed = await call("GET", "/v1/check-ins", as);
      expect([created.status, listed.status]).toEqual([403, 403]);
    }
  });

  it("create_needsAMembershipId", async () => {
    const reply = await call("POST", "/v1/check-ins", asStaff(tenant), {});

    expect(reply.status).toBe(400);
  });
});
