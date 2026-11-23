import { beforeAll, describe, expect, it } from "bun:test";

import { config } from "../../lib/config";
import { call, createTenant, linkWhatsAppNumber, type TestTenant } from "../../test/fixtures";
import * as whatsappNumbersService from "./whatsapp-numbers.service";

describe("platform tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
  });

  it("me_neverListsATenantTheUserIsNotStaffAt", async () => {
    const reply = await call("GET", "/v1/me", { phone: tenantA.owner.phone });
    const ids = reply.body.data.tenants.map((tenant: { id: number }) => tenant.id);
    expect(ids).toEqual([tenantA.id]);
    expect(ids).not.toContain(tenantB.id);
  });

  it("whatsAppNumbers_belongOnlyToTheirOwnTenant", async () => {
    const numberA = await linkWhatsAppNumber(tenantA);
    const numberB = await linkWhatsAppNumber(tenantB);
    expect((await whatsappNumbersService.numberOfTenant(tenantA.id))?.id).toBe(numberA.id);
    expect((await whatsappNumbersService.numberOfTenant(tenantB.id))?.id).toBe(numberB.id);

    const reply = await call("GET", `/v1/whatsapp-numbers?phoneNumberId=${numberB.phoneNumberId}`, {
      assistantKey: config.auth.assistantApiKey,
    });
    expect(reply.body.data.content.map((row: { tenantId: number }) => row.tenantId)).toEqual([
      tenantB.id,
    ]);
  });
});
