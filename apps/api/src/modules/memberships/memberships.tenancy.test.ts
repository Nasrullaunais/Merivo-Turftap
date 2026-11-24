import { beforeAll, describe, expect, it } from "bun:test";

import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  planInput,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";

describe("memberships tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let planOfB: number;
  let membershipOfB: { id: number; customerId: number };
  const phone = uniquePhone();

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data
      .id;
    planOfB = (await call("POST", "/v1/membership-plans", asStaff(tenantB), planInput(venueOfB)))
      .body.data.id;
    // The same person is a customer of both tenants.
    for (const tenant of [tenantA, tenantB])
      await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    membershipOfB = (
      await call("POST", "/v1/memberships", asCustomer(tenantB, phone), { planId: planOfB })
    ).body.data;
  });

  const everyoneOfA = () => [
    asStaff(tenantA),
    asCustomer(tenantA, phone),
    asAssistant(tenantA, phone),
  ];

  it("memberships_anotherTenantsMembershipIsNeverSeen", async () => {
    for (const as of everyoneOfA()) {
      const reply = await call("GET", `/v1/memberships/${membershipOfB.id}`, as);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
      const list = await call("GET", `/v1/memberships?customerId=${membershipOfB.customerId}`, as);
      expect(list.body.data.content).toEqual([]);
    }
    const own = await call("GET", "/v1/memberships", asCustomer(tenantB, phone));
    expect(own.body.data.content).toHaveLength(1);
  });

  it("cancel_cannotCancelAnotherTenantsMembership", async () => {
    const cancel = { status: "CANCELLED", cancelReason: "Mistake" };
    for (const as of everyoneOfA()) {
      const reply = await call("PATCH", `/v1/memberships/${membershipOfB.id}`, as, cancel);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
    }
    const stillThere = await call("GET", `/v1/memberships/${membershipOfB.id}`, asStaff(tenantB));
    expect(stillThere.body.data.status).toBe("AWAITING_PAYMENT");
  });

  it("create_cannotBuyOrSellAnotherTenantsPlan", async () => {
    const bought = await call("POST", "/v1/memberships", asCustomer(tenantA, phone), {
      planId: planOfB,
    });
    expect(bought).toMatchObject({ status: 404, body: { code: "tt_mem_001" } });
    const sold = await call("POST", "/v1/memberships", asStaff(tenantA), {
      planId: planOfB,
      walkIn: { customerName: "Nimal", customerPhone: phone, payment: "CASH" },
    });
    expect(sold).toMatchObject({ status: 404, body: { code: "tt_mem_001" } });
  });

  it("payments_cannotPayForAnotherTenantsMembership", async () => {
    const as = asCustomer(tenantA, phone);
    const file = await call("POST", "/v1/files", as, uploadForm(imageBytes(), "RECEIPT"));
    const receipt = await call("POST", "/v1/payments", as, {
      kind: "TRANSFER",
      membershipId: membershipOfB.id,
      fileId: file.body.data.id,
    });
    expect(receipt).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
    const cash = await call("POST", "/v1/payments", asStaff(tenantA), {
      kind: "CASH",
      membershipId: membershipOfB.id,
      amount: { amount: 100_00, currency: "LKR" },
    });
    expect(cash).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
  });
});
