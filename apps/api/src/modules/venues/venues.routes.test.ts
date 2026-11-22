import { beforeAll, describe, expect, it } from "bun:test";

import { asStaff, call, createTenant, type TestTenant, venueInput } from "../../test/fixtures";

describe("venues routes", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("create_repliesWithTheEnvelopeAndIsoTimes", async () => {
    const reply = await call(
      "POST",
      "/v1/venues",
      asStaff(tenant),
      venueInput({ phone: "011 234 5678" }),
    );
    expect(reply.status).toBe(201);
    expect(reply.body).toMatchObject({ status: 201, message: "success" });
    expect(reply.body.data.phone).toBe("+94112345678");
    expect(reply.body.data.createdAt).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_listsEveryInvalidField", async () => {
    const reply = await call("POST", "/v1/venues", asStaff(tenant), { name: "", phone: "12" });
    expect(reply.status).toBe(400);
    expect(reply.body.code).toBe("tt_htt_400");
    const fields = reply.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "phone", "address", "openingHours"]));
  });

  it("create_refusesABodyThatIsNotJson", async () => {
    const reply = await call("POST", "/v1/venues", asStaff(tenant), "{not json");
    expect(reply.status).toBe(400);
    expect(reply.body.message).toContain("not valid JSON");
  });

  it("errors_carryTheRequestIdAsTraceId", async () => {
    const reply = await call("GET", "/v1/venues/999999999", asStaff(tenant));
    expect(reply.status).toBe(404);
    expect(reply.body).toMatchObject({
      code: "tt_ven_001",
      traceId: reply.headers.get("X-Request-Id"),
    });
  });

  it("patch_leavesOutFieldsAloneAndClearsNullOnes", async () => {
    const created = await call(
      "POST",
      "/v1/venues",
      asStaff(tenant),
      venueInput({ description: "Indoor" }),
    );
    const id = created.body.data.id;
    const patched = await call("PATCH", `/v1/venues/${id}`, asStaff(tenant), { description: null });
    expect(patched.body.data).toMatchObject({ description: null, name: created.body.data.name });
  });

  it("patch_withNothingToChangeRepliesWithTheVenue", async () => {
    const created = await call("POST", "/v1/venues", asStaff(tenant), venueInput());
    const id = created.body.data.id;
    const patched = await call("PATCH", `/v1/venues/${id}`, asStaff(tenant), {});
    expect(patched).toMatchObject({
      status: 200,
      body: { data: { id, name: created.body.data.name } },
    });
  });

  it("list_refusesFiltersItDoesNotDeclare", async () => {
    const reply = await call("GET", "/v1/venues?tenantId=1", asStaff(tenant));
    expect(reply.status).toBe(400);
    expect(reply.body.errors[0].field).toBe("");
  });

  it("list_refusesSortingByAnUndeclaredField", async () => {
    const reply = await call("GET", "/v1/venues?sort=address,asc", asStaff(tenant));
    expect(reply.status).toBe(400);
    expect(reply.body.errors[0].field).toBe("sort");
  });

  it("list_pagesAndSorts", async () => {
    const other = await createTenant();
    for (const name of ["Charlie", "alpha", "Bravo"]) {
      await call("POST", "/v1/venues", asStaff(other), venueInput({ name }));
    }
    const reply = await call("GET", "/v1/venues?size=2&sort=name,desc", asStaff(other));
    expect(reply.body.data).toMatchObject({ page: 0, size: 2, totalElements: 3, totalPages: 2 });
    expect(reply.body.data.content.map((venue: { name: string }) => venue.name)).toEqual([
      "Charlie",
      "Bravo",
    ]);
  });

  it("unknownRoute_repliesWithTheEnvelope", async () => {
    const reply = await call("GET", "/v1/nothing-here", asStaff(tenant));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_htt_404" } });
  });
});

describe("SIG-05 venue permissions", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("frontDesk_canReadButNotCreate", async () => {
    expect((await call("GET", "/v1/venues", asStaff(tenant, tenant.frontDesk))).status).toBe(200);
    const reply = await call("POST", "/v1/venues", asStaff(tenant, tenant.frontDesk), venueInput());
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });

  it("manager_cannotDeleteAVenue", async () => {
    const created = await call("POST", "/v1/venues", asStaff(tenant), venueInput());
    const reply = await call(
      "DELETE",
      `/v1/venues/${created.body.data.id}`,
      asStaff(tenant, tenant.manager),
    );
    expect(reply.status).toBe(403);
  });

  it("owner_canDeleteAVenue", async () => {
    const created = await call("POST", "/v1/venues", asStaff(tenant), venueInput());
    const reply = await call("DELETE", `/v1/venues/${created.body.data.id}`, asStaff(tenant));
    expect(reply).toMatchObject({ status: 200, body: { data: null } });
  });

  it("someoneWhoIsNotStaff_isRefused", async () => {
    const reply = await call("GET", "/v1/venues", { phone: "+94770000999", tenantId: tenant.id });
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_plt_002" } });
  });

  it("staffWithoutATenantHeader_isAskedToChooseOne", async () => {
    const reply = await call("POST", "/v1/venues", { phone: tenant.owner.phone }, venueInput());
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
    expect(reply.body.message).toContain("X-Tenant-Id");
  });

  it("someoneNotSignedIn_mustSignInToCreate", async () => {
    const reply = await call("POST", "/v1/venues", { tenantSlug: tenant.slug }, venueInput());
    expect(reply).toMatchObject({ status: 401, body: { code: "tt_htt_401" } });
  });
});

describe("POR-02 browsing venues without signing in", () => {
  it("list_worksWithOnlyTheTenantSlug", async () => {
    const tenant = await createTenant();
    await call("POST", "/v1/venues", asStaff(tenant), venueInput({ name: "Open Arena" }));
    const reply = await call("GET", "/v1/venues", { tenantSlug: tenant.slug });
    expect(reply.status).toBe(200);
    expect(reply.body.data.content[0].name).toBe("Open Arena");
  });

  it("list_needsATenant", async () => {
    const reply = await call("GET", "/v1/venues");
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
  });

  it("POR-01 anUnknownSlug_isNotFound", async () => {
    const reply = await call("GET", "/v1/venues", { tenantSlug: "no-such-tenant" });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_plt_001" } });
  });
});
