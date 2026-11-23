import { z } from "zod";

import { Id, PhoneNumber, Timestamp } from "./common";

const MAX_PHONE_NUMBER_ID_LENGTH = 32;

/** Meta's id for a WhatsApp Business number, sent with every message that reaches it. */
export const PhoneNumberId = z
  .string()
  .trim()
  .regex(/^\d+$/, "Must be Meta's phone number id: digits only")
  .max(MAX_PHONE_NUMBER_ID_LENGTH);

/** A tenant's WhatsApp Business number (PLA-02). The Assistant looks it up to find the tenant. */
export const WhatsAppNumber = z
  .object({
    id: Id,
    tenantId: Id,
    phoneNumberId: z.string(),
    phone: PhoneNumber,
    /** False when the tenant is turned off: the Assistant then doesn't reply. */
    tenantActive: z.boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "WhatsAppNumber" });

export const WhatsAppNumberFilters = z.object({ phoneNumberId: PhoneNumberId });

export const WHATSAPP_NUMBER_SORT_FIELDS = ["createdAt"] as const;

export type WhatsAppNumber = z.output<typeof WhatsAppNumber>;
export type WhatsAppNumberFilters = z.output<typeof WhatsAppNumberFilters>;
