import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { transaction } from "../../lib/db";
import { logger } from "../../lib/logger";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  createTenant,
  linkWhatsAppNumber,
  messagesTo,
  queuedMessagesFor,
  sendQueuedMessages,
  type TestTenant,
  turnOff,
  uniquePhone,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as notificationsService from "./notifications.service";

const TEMPLATE = WHATSAPP_TEMPLATES.bookingReminder;
const VALUES = ["Kick Off Arena", "Court 1", "Sat 6 Dec, 18:00"];

const addCustomer = (tenant: TestTenant) =>
  customersService.create(tenant.frontDesk.auth, { name: "Nimal Perera", phone: uniquePhone() });

const notify = (tenant: TestTenant, customerId: number) =>
  transaction(() =>
    notificationsService.notifyCustomer(tenant.frontDesk.auth, {
      customerId,
      template: TEMPLATE,
      values: VALUES,
    }),
  );

describe("AST-07 messages from the venue", () => {
  afterEach(() => {
    mock.restore();
  });

  it("notifyCustomer_sendsTheTemplateFromTheTenantsOwnNumber", async () => {
    const tenant = await createTenant();
    const number = await linkWhatsAppNumber(tenant);
    const customer = await addCustomer(tenant);
    await notify(tenant, customer.id);
    await sendQueuedMessages(customer.id);
    expect(messagesTo(customer.phone)).toEqual([
      {
        kind: "template",
        from: number.phoneNumberId,
        to: customer.phone,
        template: TEMPLATE,
        values: VALUES,
      },
    ]);
  });

  it("notifyCustomer_queuesNothingWhenTheTransactionRollsBack", async () => {
    const tenant = await createTenant();
    await linkWhatsAppNumber(tenant);
    const customer = await addCustomer(tenant);
    const saveFails = transaction(async () => {
      await notificationsService.notifyCustomer(tenant.frontDesk.auth, {
        customerId: customer.id,
        template: TEMPLATE,
        values: VALUES,
      });
      throw new Error("the booking did not save");
    });
    await expect(saveFails).rejects.toThrow("the booking did not save");
    expect(await queuedMessagesFor(customer.id)).toEqual([]);
  });

  it("sendMessage_goesToThePhoneTheCustomerHasWhenItIsSent", async () => {
    const tenant = await createTenant();
    await linkWhatsAppNumber(tenant);
    const customer = await addCustomer(tenant);
    await notify(tenant, customer.id);
    const newPhone = uniquePhone();
    await customersService.update(tenant.frontDesk.auth, customer.id, { phone: newPhone });
    await sendQueuedMessages(customer.id);
    expect(messagesTo(customer.phone)).toEqual([]);
    expect(messagesTo(newPhone)).toHaveLength(1);
  });

  it("sendMessage_withNoLinkedNumberSendsNothingAndLogsAWarning", async () => {
    const tenant = await createTenant();
    const customer = await addCustomer(tenant);
    const warn = spyOn(logger, "warn");
    await notify(tenant, customer.id);
    await sendQueuedMessages(customer.id);
    expect(messagesTo(customer.phone)).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      { tenantId: tenant.id, template: TEMPLATE },
      expect.stringContaining("no WhatsApp number"),
    );
  });

  it("sendMessage_fromATenantThatIsOffSendsNothing", async () => {
    const tenant = await createTenant();
    await linkWhatsAppNumber(tenant);
    const customer = await addCustomer(tenant);
    await notify(tenant, customer.id);
    await turnOff(tenant);
    await sendQueuedMessages(customer.id);
    expect(messagesTo(customer.phone)).toEqual([]);
  });
});
