import { defineJob } from "../../lib/jobs";
import { logger } from "../../lib/logger";
import { ports } from "../../ports";
import type { WhatsAppTemplate } from "../../ports/messaging-channel";
import * as customersService from "../customers/customers.service";
import * as usersService from "../platform/users.service";
import * as whatsappNumbersService from "../platform/whatsapp-numbers.service";

export type MessageData = {
  tenantId: number;
  customerId: number;
  template: WhatsAppTemplate;
  values: string[];
};

/** AST-07: sends a template message to a customer from their tenant's own WhatsApp number. */
export async function sendMessage({ tenantId, customerId, template, values }: MessageData) {
  const [tenant, number, customer] = await Promise.all([
    usersService.tenantById(tenantId),
    whatsappNumbersService.numberOfTenant(tenantId),
    customersService.get({ actor: "system", tenantId }, customerId),
  ]);
  if (!tenant?.active) return;
  if (!number) {
    logger.warn({ tenantId, template }, "tenant has no WhatsApp number; message not sent (D-04)");
    return;
  }
  await ports().messaging.send({
    kind: "template",
    from: number.phoneNumberId,
    to: customer.phone,
    template,
    values,
  });
}

export const sendMessageJob = defineJob<MessageData>("send-message", sendMessage);
