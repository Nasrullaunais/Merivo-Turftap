import { beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";

import { config } from "../../lib/config";
import { db } from "../../lib/db";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  linkWhatsAppNumber,
  type TestTenant,
  turnOff,
  uniquePhone,
  uniquePhoneNumberId,
} from "../../test/fixtures";
import { users } from "./platform.tables";

const lookup = (phoneNumberId: string) => `/v1/whatsapp-numbers?phoneNumberId=${phoneNumberId}`;
const asAssistantWithoutTenant = { assistantKey: config.auth.assistantApiKey };

describe("PLA-02, AST-05 GET /v1/whatsapp-numbers", () => {
  let tenant: TestTenant;
  let number: Awaited<ReturnType<typeof linkWhatsAppNumber>>;

  beforeAll(async () => {
    tenant = await createTenant();
    number = await linkWhatsAppNumber(tenant);
  });

  it("lookup_findsTheTenantOfANumberWithoutATenantHeader", async () => {
    const reply = await call("GET", lookup(number.phoneNumberId), asAssistantWithoutTenant);
    expect(reply.status).toBe(200);
    expect(reply.body.data).toMatchObject({ totalElements: 1, page: 0 });
    expect(reply.body.data.content).toEqual([
      {
        id: number.id,
        tenantId: tenant.id,
        phoneNumberId: number.phoneNumberId,
        phone: number.phone,
        tenantActive: true,
        createdAt: expect.stringMatching(/Z$/),
        updatedAt: expect.stringMatching(/Z$/),
      },
    ]);
  });

  it("lookup_returnsNothingForAnUnknownNumber", async () => {
    const reply = await call("GET", lookup(uniquePhoneNumberId()), asAssistantWithoutTenant);
    expect(reply.status).toBe(200);
    expect(reply.body.data).toMatchObject({ content: [], totalElements: 0 });
  });

  it("lookup_saysWhenTheTenantIsOff", async () => {
    const offTenant = await createTenant();
    const offNumber = await linkWhatsAppNumber(offTenant);
    await turnOff(offTenant);
    const reply = await call("GET", lookup(offNumber.phoneNumberId), asAssistantWithoutTenant);
    expect(reply.body.data.content).toEqual([
      expect.objectContaining({ tenantId: offTenant.id, tenantActive: false }),
    ]);
  });

  it("lookup_needsAPhoneNumberId", async () => {
    for (const path of ["/v1/whatsapp-numbers", lookup("not-digits")]) {
      const reply = await call("GET", path, asAssistantWithoutTenant);
      expect(reply.status).toBe(400);
      expect(reply.body.errors).toEqual([expect.objectContaining({ field: "phoneNumberId" })]);
    }
  });

  it("lookup_refusesStaffPlatformAdminsAndCustomers", async () => {
    const admin = uniquePhone();
    await call("GET", "/v1/me", { phone: admin });
    await db().update(users).set({ isPlatformAdmin: true }).where(eq(users.phone, admin));

    const callers = [
      asStaff(tenant),
      { phone: tenant.owner.phone },
      { phone: admin },
      { phone: admin, tenantId: tenant.id },
      asCustomer(tenant, uniquePhone()),
    ];
    for (const as of callers) {
      const reply = await call("GET", lookup(number.phoneNumberId), as);
      expect(reply.status).toBe(403);
      expect(reply.body.code).toBe("tt_htt_403");
    }
  });

  it("lookup_refusesSomeoneNotSignedInOrAWrongAssistantKey", async () => {
    const anonymous = await call("GET", lookup(number.phoneNumberId));
    expect(anonymous.status).toBe(401);
    const wrongKey = await call("GET", lookup(number.phoneNumberId), { assistantKey: "wrong" });
    expect(wrongKey).toMatchObject({ status: 401, body: { code: "tt_plt_005" } });
  });

  it("whatsappNumbers_haveNoRoutesButTheLookup", async () => {
    const body = {
      tenantId: tenant.id,
      phoneNumberId: uniquePhoneNumberId(),
      phone: uniquePhone(),
    };
    const post = await call("POST", "/v1/whatsapp-numbers", asAssistantWithoutTenant, body);
    const get = await call("GET", `/v1/whatsapp-numbers/${number.id}`, asAssistantWithoutTenant);
    expect([post.status, get.status]).toEqual([404, 404]);
  });
});
