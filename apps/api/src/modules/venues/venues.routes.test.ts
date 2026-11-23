import { beforeAll, describe, expect, it } from "bun:test";

import { asStaff, call, createTenant, type TestTenant, venueInput } from "../../test/fixtures";

describe("venues routes", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("create_repliesWithTheEnvelopeAndIsoTimes", async () => {
    const reply = await call("POST", "/v1/venues", asStaff(tenant), {
      ...venueInput(),
      phone: "011 234 5678",
    });
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

describe("VEN-03 venue payment settings", () => {
  let tenant: TestTenant;
  let path: string;
  beforeAll(async () => {
    tenant = await createTenant();
    const created = await call("POST", "/v1/venues", asStaff(tenant), venueInput());
    path = `/v1/venues/${created.body.data.id}`;
  });

  const bankAccount = {
    bankName: " Bank of Ceylon ",
    branch: "Kollupitiya",
    accountName: "Kick Off Arena (Pvt) Ltd",
    accountNumber: "0071 2345 678",
  };

  it("create_startsWithFullPaymentATwentyMinuteLimitAndASixHourCutOff", async () => {
    const reply = await call("POST", "/v1/venues", asStaff(tenant), {
      name: "Fresh Arena",
      address: "1 Main Street, Galle",
      phone: "0912345678",
      openingHours: [],
    });
    expect(reply.body.data).toMatchObject({
      bankAccount: null,
      advancePercent: 100,
      paymentTimeLimitMinutes: 20,
      cancellationCutOffHours: 6,
      payAtVenue: false,
      seriesPaymentDaysBefore: 2,
    });
  });

  it("owner_setsTheBankAccountAndHowCustomersPay", async () => {
    const reply = await call("PATCH", path, asStaff(tenant), {
      bankAccount,
      advancePercent: 30,
      paymentTimeLimitMinutes: 45,
      cancellationCutOffHours: 12,
      seriesPaymentDaysBefore: 3,
    });
    expect(reply.status).toBe(200);
    const saved = (await call("GET", path, asStaff(tenant))).body.data;
    expect(saved).toMatchObject({
      bankAccount: { ...bankAccount, bankName: "Bank of Ceylon" },
      advancePercent: 30,
      paymentTimeLimitMinutes: 45,
      cancellationCutOffHours: 12,
      seriesPaymentDaysBefore: 3,
    });
  });

  it("owner_turnsOnPayAtVenueWithoutABankAccount", async () => {
    const created = await call(
      "POST",
      "/v1/venues",
      asStaff(tenant),
      venueInput({ payAtVenue: true }),
    );
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ payAtVenue: true, bankAccount: null });
  });

  it("owner_turningPayAtVenueOffAgainFindsTheBankAccountStillThere", async () => {
    await call("PATCH", path, asStaff(tenant), { bankAccount, advancePercent: 30 });
    await call("PATCH", path, asStaff(tenant), { payAtVenue: true });
    const reply = await call("PATCH", path, asStaff(tenant), { payAtVenue: false });
    expect(reply.body.data).toMatchObject({
      payAtVenue: false,
      bankAccount: { accountNumber: "0071 2345 678" },
      advancePercent: 30,
    });
  });

  it("owner_canLeaveOutTheBranch", async () => {
    const { branch: _branch, ...withoutBranch } = bankAccount;
    const reply = await call("PATCH", path, asStaff(tenant), { bankAccount: withoutBranch });
    expect(reply.body.data.bankAccount.branch).toBeNull();
  });

  it("owner_canRemoveTheBankAccount", async () => {
    await call("PATCH", path, asStaff(tenant), { bankAccount });
    const reply = await call("PATCH", path, asStaff(tenant), { bankAccount: null });
    expect(reply.body.data.bankAccount).toBeNull();
  });

  it("update_refusesValuesOutsideTheAllowedRange", async () => {
    const reply = await call("PATCH", path, asStaff(tenant), {
      advancePercent: 0,
      paymentTimeLimitMinutes: 5,
      cancellationCutOffHours: -1,
      seriesPaymentDaysBefore: 0,
    });
    expect(reply.status).toBe(400);
    const fields = reply.body.errors.map((error: { field: string }) => error.field).toSorted();
    expect(fields).toEqual(
      [
        "advancePercent",
        "cancellationCutOffHours",
        "paymentTimeLimitMinutes",
        "seriesPaymentDaysBefore",
      ].toSorted(),
    );
    const tooMuch = await call("PATCH", path, asStaff(tenant), {
      advancePercent: 101,
      seriesPaymentDaysBefore: 8,
    });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.errors.map((error: { field: string }) => error.field).toSorted()).toEqual([
      "advancePercent",
      "seriesPaymentDaysBefore",
    ]);
  });

  it("update_acceptsSeriesPaymentDaysFromOneToSeven", async () => {
    for (const days of [1, 7]) {
      const reply = await call("PATCH", path, asStaff(tenant), { seriesPaymentDaysBefore: days });
      expect(reply.body.data.seriesPaymentDaysBefore).toBe(days);
    }
  });

  it("update_refusesAnAccountNumberWithLetters", async () => {
    const reply = await call("PATCH", path, asStaff(tenant), {
      bankAccount: { ...bankAccount, accountNumber: "ABC-123" },
    });
    expect(reply.status).toBe(400);
    expect(reply.body.errors.map((error: { field: string }) => error.field)).toEqual([
      "bankAccount.accountNumber",
    ]);
  });

  it("manager_cannotChangePaymentSettings", async () => {
    for (const change of [{ advancePercent: 50 }, { payAtVenue: true }]) {
      const reply = await call("PATCH", path, asStaff(tenant, tenant.manager), change);
      expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
    }
  });

  it("customers_seeTheBankAccountAndTerms", async () => {
    await call("PATCH", path, asStaff(tenant), { bankAccount, advancePercent: 30 });
    const reply = await call("GET", path, { tenantSlug: tenant.slug });
    expect(reply.body.data).toMatchObject({
      bankAccount: { accountNumber: "0071 2345 678" },
      advancePercent: 30,
    });
  });
});
