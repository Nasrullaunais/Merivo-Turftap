import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  planInput,
  type TestTenant,
  gymInput,
} from "../../test/fixtures";

const fieldsOf = (reply: { body: { errors: { field: string }[] } }) =>
  reply.body.errors.map((error) => error.field);

describe("membership-plans routes", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), gymInput())).body.data.id;
  });

  it("create_repliesWithTheEnvelope", async () => {
    const reply = await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId));
    expect(reply).toMatchObject({
      status: 201,
      body: { status: 201, message: "success", data: { lengthUnit: "MONTHS", active: true } },
    });
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_refusesAnUnknownUnitAZeroLengthAndHalfRupees", async () => {
    const reply = await call("POST", "/v1/membership-plans", asStaff(tenant), {
      ...planInput(venueId),
      lengthCount: 0,
      lengthUnit: "WEEKS",
      price: { amount: 500_050, currency: "LKR" },
    });
    expect(reply.status).toBe(400);
    expect(fieldsOf(reply)).toEqual(
      expect.arrayContaining(["lengthCount", "lengthUnit", "price.amount"]),
    );
  });

  it("create_refusesALengthOverTheLimitForItsUnit", async () => {
    const days = await call("POST", "/v1/membership-plans", asStaff(tenant), {
      ...planInput(venueId),
      lengthCount: 366,
      lengthUnit: "DAYS",
    });
    const months = await call("POST", "/v1/membership-plans", asStaff(tenant), {
      ...planInput(venueId),
      lengthCount: 25,
      lengthUnit: "MONTHS",
    });
    expect(days.status).toBe(400);
    expect(fieldsOf(days)).toEqual(["lengthCount"]);
    expect(months.status).toBe(400);
  });

  it("update_refusesALengthWithoutItsUnit", async () => {
    const created = await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId));
    const path = `/v1/membership-plans/${created.body.data.id}`;
    const reply = await call("PATCH", path, asStaff(tenant), { lengthCount: 6 });
    expect(reply.status).toBe(400);
    expect(fieldsOf(reply)).toEqual(["lengthUnit"]);
    const both = await call("PATCH", path, asStaff(tenant), {
      lengthCount: 6,
      lengthUnit: "MONTHS",
    });
    expect(both.body.data).toMatchObject({ lengthCount: 6, lengthUnit: "MONTHS" });
  });

  it("update_neverMovesAPlanToAnotherVenue", async () => {
    const other = (await call("POST", "/v1/venues", asStaff(tenant), gymInput())).body.data.id;
    const created = await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId));
    const reply = await call(
      "PATCH",
      `/v1/membership-plans/${created.body.data.id}`,
      asStaff(tenant),
      { venueId: other },
    );
    expect(reply.body.data.venueId).toBe(venueId);
  });

  it("listAndGet_areOpenWithOnlyTheTenantSlug", async () => {
    const created = await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId));
    const asPublic = { tenantSlug: tenant.slug };
    const list = await call("GET", `/v1/membership-plans?venueId=${venueId}`, asPublic);
    expect(list.status).toBe(200);
    expect(list.body.data.content.length).toBeGreaterThan(0);
    const one = await call("GET", `/v1/membership-plans/${created.body.data.id}`, asPublic);
    expect(one.status).toBe(200);
  });

  it("public_cannotAddAPlan", async () => {
    const reply = await call(
      "POST",
      "/v1/membership-plans",
      { tenantSlug: tenant.slug },
      planInput(venueId),
    );
    expect(reply.status).toBe(401);
  });
});

describe("SIG-05 Membership Plan permissions", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), gymInput())).body.data.id;
  });

  it("manager_canAddChangeAndTurnOffAPlan", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    const created = await call("POST", "/v1/membership-plans", asManager, planInput(venueId));
    expect(created.status).toBe(201);
    const path = `/v1/membership-plans/${created.body.data.id}`;
    expect((await call("PATCH", path, asManager, { name: "Renamed" })).status).toBe(200);
    expect((await call("DELETE", path, asManager)).status).toBe(200);
    expect((await call("GET", path, asManager)).body.data.active).toBe(false);
  });

  it("frontDesk_canReadButNotAddChangeOrTurnOff", async () => {
    const created = await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId));
    const path = `/v1/membership-plans/${created.body.data.id}`;
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    expect((await call("GET", "/v1/membership-plans", asFrontDesk)).status).toBe(200);
    const refused = [
      await call("POST", "/v1/membership-plans", asFrontDesk, planInput(venueId)),
      await call("PATCH", path, asFrontDesk, { name: "Mine" }),
      await call("DELETE", path, asFrontDesk),
    ];
    expect(refused.map((reply) => reply.status)).toEqual([403, 403, 403]);
  });
});
