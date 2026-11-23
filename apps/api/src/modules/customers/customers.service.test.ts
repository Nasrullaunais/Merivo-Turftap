import { beforeAll, describe, expect, it } from "bun:test";

import type { CustomerFilters } from "@turftap/contract";

import { createTenant, type TestTenant, uniquePhone } from "../../test/fixtures";
import * as customersService from "./customers.service";

const SAME_MOMENT_CALLS = 8;
const FIRST_PAGE = { page: 0, size: 20, sort: { field: "name", direction: "asc" } } as const;

describe("customers", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  const create = (name: string, phone = uniquePhone()) =>
    customersService.create(tenant.frontDesk.auth, { name, phone });
  const namesFound = async (filters: CustomerFilters) =>
    (await customersService.list(tenant.frontDesk.auth, { filters, page: FIRST_PAGE })).content.map(
      (customer) => customer.name,
    );

  it("create_savesTheCustomerForTheCallersTenant", async () => {
    const phone = uniquePhone();
    const customer = await create("Nimal Perera", phone);
    expect(customer).toMatchObject({ name: "Nimal Perera", phone, tenantId: tenant.id });
  });

  it("create_refusesAPhoneAnotherCustomerHas", async () => {
    const phone = uniquePhone();
    await create("Kamal Silva", phone);
    await expect(create("Someone Else", phone)).rejects.toMatchObject({
      status: 409,
      code: "tt_cus_002",
    });
  });

  it("create_allowsTheSamePhoneInAnotherTenant", async () => {
    const other = await createTenant();
    const phone = uniquePhone();
    const here = await create("Sunil Fernando", phone);
    const there = await customersService.create(other.owner.auth, { name: "Sunil F", phone });
    expect(there.id).not.toBe(here.id);
    expect(there.tenantId).toBe(other.id);
  });

  it("update_changesTheNameAndPhone", async () => {
    const customer = await create("Ruwan");
    const phone = uniquePhone();
    const changed = await customersService.update(tenant.frontDesk.auth, customer.id, {
      name: "Ruwan Jayasuriya",
      phone,
    });
    expect(changed).toMatchObject({ id: customer.id, name: "Ruwan Jayasuriya", phone });
  });

  it("update_refusesAPhoneAnotherCustomerHas", async () => {
    const taken = await create("Amal");
    const customer = await create("Bimal");
    const again = customersService.update(tenant.frontDesk.auth, customer.id, {
      phone: taken.phone,
    });
    await expect(again).rejects.toMatchObject({ status: 409, code: "tt_cus_002" });
  });

  it("update_repliesNotFoundForAMissingCustomer", async () => {
    const missing = customersService.update(tenant.frontDesk.auth, 999_999_999, { name: "X" });
    await expect(missing).rejects.toMatchObject({ status: 404, code: "tt_cus_001" });
  });

  describe("BKG-04 findOrCreateByPhone", () => {
    it("createsACustomerForANewPhone", async () => {
      const phone = uniquePhone();
      const customer = await customersService.findOrCreateByPhone(
        tenant.frontDesk.auth,
        phone,
        "Walk In",
      );
      expect(await customersService.get(tenant.owner.auth, customer.id)).toMatchObject({
        phone,
        name: "Walk In",
      });
    });

    it("reusesTheCustomerWithThatPhoneAndKeepsTheirName", async () => {
      const known = await create("Dilan Wickrama");
      const found = await customersService.findOrCreateByPhone(
        tenant.frontDesk.auth,
        known.phone,
        "Dilan W",
      );
      expect(found).toMatchObject({ id: known.id, name: "Dilan Wickrama" });
    });

    it("givesCallsAtTheSameMomentTheSameCustomer", async () => {
      const callsFor = (phoneOf: (i: number) => string) =>
        Promise.all(
          Array.from({ length: SAME_MOMENT_CALLS }, (_, i) =>
            customersService.findOrCreateByPhone(tenant.frontDesk.auth, phoneOf(i), `Caller ${i}`),
          ),
        );
      // A first round opens enough database connections that the second round really overlaps.
      await callsFor(() => uniquePhone());
      const phone = uniquePhone();
      const found = await callsFor(() => phone);
      expect(new Set(found.map((customer) => customer.id)).size).toBe(1);
    });
  });

  describe("list", () => {
    let searchTenant: TestTenant;
    beforeAll(async () => {
      searchTenant = await createTenant();
      const auth = searchTenant.owner.auth;
      await customersService.create(auth, { name: "zara Ali", phone: "+94771234567" });
      await customersService.create(auth, { name: "Asha Kumari", phone: "+94712223333" });
      await customersService.create(auth, { name: "100% Fitness Club", phone: "+94759998888" });
    });

    const names = async (filters: CustomerFilters) =>
      (
        await customersService.list(searchTenant.frontDesk.auth, { filters, page: FIRST_PAGE })
      ).content.map((customer) => customer.name);

    it("sortsByNameIgnoringCase", async () => {
      expect(await names({})).toEqual(["100% Fitness Club", "Asha Kumari", "zara Ali"]);
    });

    it("phone_findsTheExactNumber", async () => {
      expect(await names({ phone: "+94712223333" })).toEqual(["Asha Kumari"]);
    });

    it("search_matchesPartOfANameIgnoringCase", async () => {
      expect(await names({ search: "KUMA" })).toEqual(["Asha Kumari"]);
    });

    it("search_matchesAPhoneTypedTheLocalWay", async () => {
      expect(await names({ search: "077 123" })).toEqual(["zara Ali"]);
      expect(await names({ search: "071-222" })).toEqual(["Asha Kumari"]);
    });

    it("search_matchesTheMiddleOfAPhone", async () => {
      expect(await names({ search: "9998" })).toEqual(["100% Fitness Club"]);
    });

    it("search_takesPercentSignsLiterally", async () => {
      expect(await names({ search: "%" })).toEqual(["100% Fitness Club"]);
    });

    it("neverShowsAnotherTenantsCustomers", async () => {
      expect(await namesFound({ phone: "+94771234567" })).toEqual([]);
    });
  });
});
