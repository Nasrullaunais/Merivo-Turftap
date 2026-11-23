import { beforeAll, describe, expect, it } from "bun:test";

import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  limitToVenues,
  type TestTenant,
  turnOff,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

/** "+94771234567" written the way a person types it: "077 123 4567". */
const typedLocally = (phone: string) =>
  `0${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;

describe("customers routes", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  const addCustomer = async (name = "Nimal Perera", phone = uniquePhone()) =>
    (await call("POST", "/v1/customers", asStaff(tenant), { name, phone })).body.data;

  it("create_repliesWithTheEnvelopeAndAStoredPhone", async () => {
    const phone = uniquePhone();
    const reply = await call("POST", "/v1/customers", asStaff(tenant, tenant.frontDesk), {
      name: "  Kamala Dias ",
      phone: typedLocally(phone),
    });
    expect(reply.status).toBe(201);
    expect(reply.body).toMatchObject({ status: 201, message: "success" });
    expect(reply.body.data).toMatchObject({ name: "Kamala Dias", phone });
    expect(reply.body.data.createdAt).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_listsEveryInvalidField", async () => {
    const reply = await call("POST", "/v1/customers", asStaff(tenant), { name: " ", phone: "12" });
    expect(reply.status).toBe(400);
    const fields = reply.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "phone"]));
  });

  it("create_refusesADuplicatePhoneWithItsOwnMessage", async () => {
    const phone = uniquePhone();
    await addCustomer("First", phone);
    const reply = await call("POST", "/v1/customers", asStaff(tenant), {
      name: "Second",
      phone: typedLocally(phone),
    });
    expect(reply).toMatchObject({
      status: 409,
      body: { code: "tt_cus_002", message: "Another customer already has this phone number" },
    });
  });

  it("get_repliesNotFoundForAMissingCustomer", async () => {
    const reply = await call("GET", "/v1/customers/999999999", asStaff(tenant));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_cus_001" } });
  });

  it("patch_leavesOutFieldsAlone", async () => {
    const customer = await addCustomer("Ruwan");
    const reply = await call("PATCH", `/v1/customers/${customer.id}`, asStaff(tenant), {
      name: "Ruwan Silva",
    });
    expect(reply.body.data).toMatchObject({ name: "Ruwan Silva", phone: customer.phone });
  });

  it("patch_refusesClearingTheName", async () => {
    const customer = await addCustomer();
    const reply = await call("PATCH", `/v1/customers/${customer.id}`, asStaff(tenant), {
      name: null,
    });
    expect(reply.status).toBe(400);
    expect(reply.body.errors[0].field).toBe("name");
  });

  it("list_filtersByPhoneTypedTheLocalWay", async () => {
    const customer = await addCustomer("Phone Match");
    const query = new URLSearchParams({ phone: typedLocally(customer.phone) });
    const reply = await call("GET", `/v1/customers?${query}`, asStaff(tenant));
    expect(reply.body.data.content).toEqual([customer]);
  });

  it("list_refusesAnInvalidPhoneFilter", async () => {
    const reply = await call("GET", "/v1/customers?phone=abc", asStaff(tenant));
    expect(reply.status).toBe(400);
    expect(reply.body.errors[0].field).toBe("phone");
  });

  it("delete_isNotARoute", async () => {
    const customer = await addCustomer();
    const reply = await call("DELETE", `/v1/customers/${customer.id}`, asStaff(tenant));
    expect(reply.status).toBe(404);
    expect((await call("GET", `/v1/customers/${customer.id}`, asStaff(tenant))).status).toBe(200);
  });

  it("frontDesk_canFindAddAndChangeCustomers", async () => {
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    const created = await call("POST", "/v1/customers", asFrontDesk, {
      name: "Desk Added",
      phone: uniquePhone(),
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await call("GET", `/v1/customers/${id}`, asFrontDesk)).status).toBe(200);
    expect((await call("GET", "/v1/customers", asFrontDesk)).status).toBe(200);
    const patched = await call("PATCH", `/v1/customers/${id}`, asFrontDesk, { name: "Desk" });
    expect(patched.status).toBe(200);
  });

  it("limitedManager_stillFindsEveryCustomer", async () => {
    const venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
    await limitToVenues(tenant, tenant.manager, [venueId]);
    const customer = await addCustomer("Any Branch");
    const asManager = asStaff(tenant, tenant.manager);
    expect((await call("GET", `/v1/customers/${customer.id}`, asManager)).body.data).toEqual(
      customer,
    );
    const query = new URLSearchParams({ phone: customer.phone });
    const listed = await call("GET", `/v1/customers?${query}`, asManager);
    expect(listed.body.data.content).toEqual([customer]);
  });

  it("notSignedIn_isRefused", async () => {
    const reply = await call("GET", "/v1/customers", { tenantSlug: tenant.slug });
    expect(reply.status).toBe(401);
  });
});

describe("POR-03, AST-05 a customer and the Assistant reach only their own record", () => {
  let tenant: TestTenant;
  let someoneElse: { id: number; phone: string; name: string };
  beforeAll(async () => {
    tenant = await createTenant();
    const body = { name: "Someone Else", phone: uniquePhone() };
    someoneElse = (await call("POST", "/v1/customers", asStaff(tenant), body)).body.data;
  });

  const callers = [
    ["customer", (phone: string) => asCustomer(tenant, phone)],
    ["assistant", (phone: string) => asAssistant(tenant, phone)],
  ] as const;

  for (const [actor, as] of callers) {
    it(`${actor}_createsTheirOwnRecordOnceAndThenSeesIt`, async () => {
      const phone = uniquePhone();
      expect((await call("GET", "/v1/customers", as(phone))).body.data.content).toEqual([]);

      const created = await call("POST", "/v1/customers", as(phone), { name: "Kasun", phone });
      expect(created).toMatchObject({ status: 201, body: { data: { name: "Kasun", phone } } });
      const mine = created.body.data;

      expect((await call("GET", `/v1/customers/${mine.id}`, as(phone))).body.data).toEqual(mine);
      expect((await call("GET", "/v1/customers", as(phone))).body.data.content).toEqual([mine]);
      const again = await call("POST", "/v1/customers", as(phone), { name: "Kasun", phone });
      expect(again).toMatchObject({ status: 409, body: { code: "tt_cus_002" } });
    });

    it(`${actor}_getsNotFoundForAnotherPhonesRecord`, async () => {
      const reply = await call("GET", `/v1/customers/${someoneElse.id}`, as(uniquePhone()));
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_cus_001" } });
    });

    it(`${actor}_listNeverShowsAnotherPhonesRecord`, async () => {
      const byPhone = new URLSearchParams({ phone: someoneElse.phone });
      const bySearch = new URLSearchParams({ search: someoneElse.name });
      for (const query of [byPhone, bySearch, new URLSearchParams()]) {
        const reply = await call("GET", `/v1/customers?${query}`, as(uniquePhone()));
        expect(reply.body.data.content).toEqual([]);
      }
    });

    it(`${actor}_cannotCreateARecordForAnotherPhone`, async () => {
      const body = { name: "Not Me", phone: uniquePhone() };
      const reply = await call("POST", "/v1/customers", as(uniquePhone()), body);
      expect(reply).toMatchObject({ status: 403, body: { code: "tt_cus_003" } });
      const listed = await call("GET", "/v1/customers", as(body.phone));
      expect(listed.body.data.content).toEqual([]);
    });

    it(`${actor}_cannotChangeTheirRecord`, async () => {
      const phone = uniquePhone();
      const mine = (await call("POST", "/v1/customers", as(phone), { name: "Dilan", phone })).body
        .data;
      const reply = await call("PATCH", `/v1/customers/${mine.id}`, as(phone), { name: "Other" });
      expect(reply.status).toBe(403);
    });

    it(`${actor}_isRefusedByATenantThatIsOff`, async () => {
      const offTenant = await createTenant();
      await turnOff(offTenant);
      const phone = uniquePhone();
      const as =
        actor === "customer" ? asCustomer(offTenant, phone) : asAssistant(offTenant, phone);
      const reply = await call("GET", "/v1/customers", as);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_plt_001" } });
    });
  }

  it("customer_seesTheRecordTheAssistantMadeForTheirPhone", async () => {
    const phone = uniquePhone();
    const body = { name: "Nadeesha", phone };
    const made = (await call("POST", "/v1/customers", asAssistant(tenant, phone), body)).body.data;
    const seen = await call("GET", "/v1/customers", asCustomer(tenant, phone));
    expect(seen.body.data.content).toEqual([made]);
  });

  it("customer_createsWithTheirPhoneTypedLocally", async () => {
    const phone = uniquePhone();
    const body = { name: "Chamari", phone: typedLocally(phone) };
    const reply = await call("POST", "/v1/customers", asCustomer(tenant, phone), body);
    expect(reply).toMatchObject({ status: 201, body: { data: { phone } } });
  });

  it("assistant_withAWrongKeyIsRefused", async () => {
    const as = { ...asAssistant(tenant, uniquePhone()), assistantKey: "x".repeat(40) };
    const reply = await call("GET", "/v1/customers", as);
    expect(reply).toMatchObject({ status: 401, body: { code: "tt_plt_005" } });
  });

  it("assistant_withoutACustomerPhoneIsRefused", async () => {
    for (const customerPhone of [undefined, "not a phone"]) {
      const as = { ...asAssistant(tenant, uniquePhone()), customerPhone };
      const reply = await call("GET", "/v1/customers", as);
      expect(reply).toMatchObject({ status: 400, body: { code: "tt_plt_006" } });
    }
  });

  it("assistant_withoutATenantIsRefused", async () => {
    const as = { ...asAssistant(tenant, uniquePhone()), tenantId: undefined };
    const reply = await call("GET", "/v1/customers", as);
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
  });
});
