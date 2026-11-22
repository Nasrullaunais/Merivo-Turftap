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

describe("price-rules routes", () => {
  let tenant: TestTenant;
  let venueId: number;
  const newResource = async () =>
    (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId))).body.data.id;

  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
  });

  it("create_repliesWithTheEnvelopeAndTimesAsText", async () => {
    const resourceId = await newResource();
    const reply = await call(
      "POST",
      "/v1/price-rules",
      asStaff(tenant),
      priceRuleInput(resourceId),
    );
    expect(reply).toMatchObject({
      status: 201,
      body: {
        status: 201,
        message: "success",
        data: {
          resourceId,
          weekdays: [6, 7],
          startTime: "18:00",
          endTime: "22:00",
          price: { amount: 400_000, currency: "LKR" },
        },
      },
    });
    expect(reply.body.data.tenantId).toBeUndefined();
    expect(reply.body.data.startMinute).toBeUndefined();
  });

  it("create_refusesNoWeekdaysAnEndBeforeTheStartAndPartRupees", async () => {
    const reply = await call("POST", "/v1/price-rules", asStaff(tenant), {
      ...priceRuleInput(await newResource()),
      weekdays: [],
      startTime: "22:00",
      endTime: "18:00",
      price: { amount: 400_050, currency: "LKR" },
    });
    expect(reply.status).toBe(400);
    const fields = reply.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["weekdays", "endTime", "price.amount"]));
  });

  it("create_toldWhichRuleClashes", async () => {
    const resourceId = await newResource();
    await call("POST", "/v1/price-rules", asStaff(tenant), priceRuleInput(resourceId));
    const reply = await call(
      "POST",
      "/v1/price-rules",
      asStaff(tenant),
      priceRuleInput(resourceId, { weekdays: [7], startTime: "20:00", endTime: "21:00" }),
    );
    expect(reply).toMatchObject({
      status: 409,
      body: {
        code: "tt_ven_006",
        message: "This overlaps the Price Rule for Sat, Sun 18:00–22:00",
      },
    });
  });

  it("update_neverMovesARuleToAnotherResource", async () => {
    const resourceId = await newResource();
    const other = await newResource();
    const created = await call(
      "POST",
      "/v1/price-rules",
      asStaff(tenant),
      priceRuleInput(resourceId),
    );
    const reply = await call("PATCH", `/v1/price-rules/${created.body.data.id}`, asStaff(tenant), {
      resourceId: other,
    });
    expect(reply.body.data.resourceId).toBe(resourceId);
  });

  it("list_isOpenWithOnlyTheTenantSlugButCreateIsNot", async () => {
    const resourceId = await newResource();
    await call("POST", "/v1/price-rules", asStaff(tenant), priceRuleInput(resourceId));
    const asPublic = { tenantSlug: tenant.slug };
    const listed = await call("GET", `/v1/price-rules?resourceId=${resourceId}`, asPublic);
    expect(listed.status).toBe(200);
    expect(listed.body.data.content).toHaveLength(1);
    const created = await call("POST", "/v1/price-rules", asPublic, priceRuleInput(resourceId));
    expect(created.status).toBe(401);
  });
});

describe("VEN-05 resource prices", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
  });

  it("createResource_needsAPriceInWholeRupees", async () => {
    const { price: _left, ...noPrice } = resourceInput(venueId);
    const missing = await call("POST", "/v1/resources", asStaff(tenant), noPrice);
    const zero = await call("POST", "/v1/resources", asStaff(tenant), {
      ...resourceInput(venueId),
      price: { amount: 0, currency: "LKR" },
    });
    for (const reply of [missing, zero]) {
      expect(reply.status).toBe(400);
      expect(reply.body.errors[0].field).toStartWith("price");
    }
  });

  it("getResource_showsTheDefaultPriceToCustomers", async () => {
    const created = await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId));
    const reply = await call("GET", `/v1/resources/${created.body.data.id}`, {
      tenantSlug: tenant.slug,
    });
    expect(reply.body.data.price).toEqual({ amount: 250_000, currency: "LKR" });
  });
});

describe("SIG-05 Price Rule permissions", () => {
  let tenant: TestTenant;
  let resourceId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    const venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
    resourceId = (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId))).body
      .data.id;
  });

  it("manager_canAddChangeAndDeleteARule", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    const created = await call("POST", "/v1/price-rules", asManager, priceRuleInput(resourceId));
    expect(created.status).toBe(201);
    const path = `/v1/price-rules/${created.body.data.id}`;
    expect((await call("PATCH", path, asManager, { endTime: "23:00" })).status).toBe(200);
    expect((await call("DELETE", path, asManager)).status).toBe(200);
  });

  it("frontDesk_canReadButNotAdd", async () => {
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    expect((await call("GET", "/v1/price-rules", asFrontDesk)).status).toBe(200);
    const reply = await call("POST", "/v1/price-rules", asFrontDesk, priceRuleInput(resourceId));
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });
});
