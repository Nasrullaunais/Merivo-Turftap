import { beforeAll, describe, expect, it } from "bun:test";

import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  type TestTenant,
  uniquePhone,
} from "../../test/fixtures";

describe("customers tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let customerOfB: { id: number; phone: string; name: string };

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    customerOfB = (
      await call("POST", "/v1/customers", asStaff(tenantB), {
        name: "Only In B",
        phone: uniquePhone(),
      })
    ).body.data;
  });

  it("get_repliesNotFoundForAnotherTenantsCustomer", async () => {
    const reply = await call("GET", `/v1/customers/${customerOfB.id}`, asStaff(tenantA));
    expect(reply.status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsCustomers", async () => {
    const byPhone = new URLSearchParams({ phone: customerOfB.phone });
    const bySearch = new URLSearchParams({ search: customerOfB.name });
    for (const query of [byPhone, bySearch, new URLSearchParams()]) {
      const reply = await call("GET", `/v1/customers?${query}`, asStaff(tenantA));
      expect(reply.body.data.content).toEqual([]);
    }
  });

  it("update_cannotChangeAnotherTenantsCustomer", async () => {
    const reply = await call("PATCH", `/v1/customers/${customerOfB.id}`, asStaff(tenantA), {
      name: "Taken over",
    });
    expect(reply.status).toBe(404);
    const stillB = await call("GET", `/v1/customers/${customerOfB.id}`, asStaff(tenantB));
    expect(stillB.body.data.name).toBe("Only In B");
  });

  it("create_withAnotherTenantsPhoneMakesASeparateRecord", async () => {
    const reply = await call("POST", "/v1/customers", asStaff(tenantA), {
      name: "Same Person",
      phone: customerOfB.phone,
    });
    expect(reply.status).toBe(201);
    expect(reply.body.data.id).not.toBe(customerOfB.id);
    const stillB = await call("GET", `/v1/customers/${customerOfB.id}`, asStaff(tenantB));
    expect(stillB.body.data.name).toBe("Only In B");
  });

  it("staffOfOneTenant_cannotPickAnotherTenant", async () => {
    const reply = await call("GET", "/v1/customers", {
      phone: tenantA.owner.phone,
      tenantId: tenantB.id,
    });
    expect(reply.status).toBe(403);
  });

  it("customerOfA_cannotReadTheirOwnPhonesRecordAtB", async () => {
    const phone = customerOfB.phone;
    for (const as of [asCustomer(tenantA, phone), asAssistant(tenantA, phone)]) {
      const reply = await call("GET", `/v1/customers/${customerOfB.id}`, as);
      expect(reply.status).toBe(404);
      const listed = await call("GET", "/v1/customers", as);
      expect(listed.body.data.content).not.toContainEqual(customerOfB);
    }
  });
});
