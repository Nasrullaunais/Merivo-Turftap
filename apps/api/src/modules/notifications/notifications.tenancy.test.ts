import { beforeAll, describe, expect, it } from "bun:test";

import { transaction } from "../../lib/db";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  createTenant,
  linkWhatsAppNumber,
  messagesTo,
  sendQueuedMessages,
  type TestTenant,
  uniquePhone,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as notificationsService from "./notifications.service";

const TEMPLATE = WHATSAPP_TEMPLATES.bookingReminder;

describe("notifications tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let numberOfA: { phoneNumberId: string };

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    numberOfA = await linkWhatsAppNumber(tenantA);
    await linkWhatsAppNumber(tenantB);
  });

  const addCustomer = (tenant: TestTenant) =>
    customersService.create(tenant.frontDesk.auth, { name: "Kamal Silva", phone: uniquePhone() });
  const notifyAs = (tenant: TestTenant, customerId: number) =>
    transaction(() =>
      notificationsService.notifyCustomer(tenant.frontDesk.auth, {
        customerId,
        template: TEMPLATE,
        values: [],
      }),
    );

  it("sendMessage_comesFromTheCallersTenantNumberNotAnotherTenants", async () => {
    const customerOfA = await addCustomer(tenantA);
    await notifyAs(tenantA, customerOfA.id);
    await sendQueuedMessages(customerOfA.id);
    expect(
      messagesTo(customerOfA.phone).map((message) => "from" in message && message.from),
    ).toEqual([numberOfA.phoneNumberId]);
  });

  it("sendMessage_refusesAnotherTenantsCustomerAndSendsThemNothing", async () => {
    const customerOfB = await addCustomer(tenantB);
    await notifyAs(tenantA, customerOfB.id);
    await expect(sendQueuedMessages(customerOfB.id)).rejects.toMatchObject({ code: "tt_cus_001" });
    expect(messagesTo(customerOfB.phone)).toEqual([]);
  });
});
