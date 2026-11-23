import { z } from "zod";

import { Id, Money, Timestamp } from "./common";

export const PAYMENT_KINDS = ["TRANSFER", "CASH", "REFUND"] as const;
export const PAYMENT_STATUSES = ["PENDING_CHECK", "ACCEPTED", "REJECTED"] as const;

const MAX_NOTE_LENGTH = 200;

export const Payment = z
  .object({
    id: Id,
    bookingId: Id.nullable(),
    venueId: Id,
    kind: z.enum(PAYMENT_KINDS),
    status: z.enum(PAYMENT_STATUSES),
    /** Negative for a refund. */
    amount: Money,
    note: z.string().nullable(),
    /** A short-lived link to a transfer's receipt file. */
    receiptUrl: z.string().nullable(),
    createdBy: Id.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Payment" });

/** PAY-08, BKG-08: cash or a refund, which staff record by hand. The amount is always above zero. */
export const RecordPayment = z
  .object({
    bookingId: Id,
    kind: z.enum(["CASH", "REFUND"]),
    amount: Money.extend({ amount: z.number().int().positive() }),
    note: z.string().trim().min(1).max(MAX_NOTE_LENGTH).nullable().default(null),
  })
  .meta({ id: "RecordPayment" });

/** PAY-02: a Transfer Receipt, uploaded first as a `RECEIPT` file. It pays the booking's amount due. */
export const SendTransferReceipt = z
  .object({ bookingId: Id, kind: z.literal("TRANSFER"), fileId: Id })
  .meta({ id: "SendTransferReceipt" });

export const CreatePayment = z
  .discriminatedUnion("kind", [RecordPayment, SendTransferReceipt])
  .meta({ id: "CreatePayment" });

export const PaymentFilters = z.object({
  bookingId: z.coerce.number().pipe(Id).optional(),
  kind: z.enum(PAYMENT_KINDS).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
});

export const PAYMENT_SORT_FIELDS = ["createdAt"] as const;

export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type Payment = z.output<typeof Payment>;
export type RecordPayment = z.output<typeof RecordPayment>;
export type SendTransferReceipt = z.output<typeof SendTransferReceipt>;
export type CreatePayment = z.output<typeof CreatePayment>;
export type PaymentFilters = z.output<typeof PaymentFilters>;
