import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

describe("resources routes", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
  });

  it("create_repliesWithTheEnvelope", async () => {
    const reply = await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId));
    expect(reply).toMatchObject({ status: 201, body: { status: 201, message: "success" } });
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_refusesAnUnknownTypeAndAnOddSlotLength", async () => {
    const reply = await call("POST", "/v1/resources", asStaff(tenant), {
      ...resourceInput(venueId),
      type: "SQUASH_COURT",
      slotMinutes: 50,
    });
    expect(reply.status).toBe(400);
    const fields = reply.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["type", "slotMinutes"]));
  });

  it("update_neverMovesAResourceToAnotherVenue", async () => {
    const other = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
    const created = await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId));
    const reply = await call("PATCH", `/v1/resources/${created.body.data.id}`, asStaff(tenant), {
      venueId: other,
    });
    expect(reply.body.data.venueId).toBe(venueId);
  });

  it("list_isOpenWithOnlyTheTenantSlug", async () => {
    await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId));
    const reply = await call("GET", `/v1/resources?venueId=${venueId}`, {
      tenantSlug: tenant.slug,
    });
    expect(reply.status).toBe(200);
    expect(reply.body.data.content.length).toBeGreaterThan(0);
  });
});

describe("SIG-05 resource permissions", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
  });

  it("manager_canAddChangeAndTurnOffAResource", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    const created = await call("POST", "/v1/resources", asManager, resourceInput(venueId));
    expect(created.status).toBe(201);
    const path = `/v1/resources/${created.body.data.id}`;
    expect((await call("PATCH", path, asManager, { name: "Renamed" })).status).toBe(200);
    expect((await call("DELETE", path, asManager)).status).toBe(200);
  });

  it("frontDesk_canReadButNotAdd", async () => {
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    expect((await call("GET", "/v1/resources", asFrontDesk)).status).toBe(200);
    const reply = await call("POST", "/v1/resources", asFrontDesk, resourceInput(venueId));
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });
});
