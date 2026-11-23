import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  type TestTenant,
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
