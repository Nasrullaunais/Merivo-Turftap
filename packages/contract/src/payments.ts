import { z } from "zod";

import { Id, LocalDate, Money, Timestamp } from "./common";

export const PAYMENT_KINDS = ["TRANSFER", "CASH", "REFUND"] as const;
export const PAYMENT_STATUSES = ["PENDING_CHECK", "ACCEPTED", "REJECTED"] as const;

const MAX_NOTE_LENGTH = 200;
const MAX_REJECT_REASON_LENGTH = 200;

/**
 * PAY-03, PAY-06: what the AI read from a Transfer Receipt, for staff to check against. A field it
 * couldn't read is `null`, and so is a flag that needs it.
 */
export const ReceiptReading = z
  .object({
    unreadable: z.boolean(),
    amount: Money.nullable(),
    paidOn: LocalDate.nullable(),
    bank: z.string().nullable(),
    reference: z.string().nullable(),
    /** The amount read is exactly the payment's amount. */
    amountMatches: z.boolean().nullable(),
    /** Paid on or after the day the booking was made, and not in the future (D-12). */
    dateRecent: z.boolean().nullable(),
    /** No earlier payment in the tenant has a receipt with this reference. */
    referenceNew: z.boolean().nullable(),
    /** The earliest payment in the tenant with the same receipt image or reference. */
    duplicateOf: z.object({ paymentId: Id, bookingId: Id.nullable() }).nullable(),
  })
  .meta({ id: "ReceiptReading" });

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
    /** Why staff rejected a transfer's receipt, sent to the customer. */
    rejectReason: z.string().nullable(),
    /** A short-lived link to a transfer's receipt file. */
    receiptUrl: z.string().nullable(),
    /** A transfer's Receipt Reading; `null` until the AI has read it. */
    receiptReading: ReceiptReading.nullable(),
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

/** PAY-04, PAY-05: a Receipt Check. Staff accept or reject a transfer; a rejection needs a reason. */
export const UpdatePayment = z
  .object({
    status: z.enum(PAYMENT_STATUSES),
    rejectReason: z.string().trim().min(1).max(MAX_REJECT_REASON_LENGTH).optional(),
  })
  .meta({ id: "UpdatePayment" });

export const PaymentFilters = z.object({
  bookingId: z.coerce.number().pipe(Id).optional(),
  kind: z.enum(PAYMENT_KINDS).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
});

export const PAYMENT_SORT_FIELDS = ["createdAt"] as const;

export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type ReceiptReading = z.output<typeof ReceiptReading>;
export type Payment = z.output<typeof Payment>;
export type RecordPayment = z.output<typeof RecordPayment>;
export type SendTransferReceipt = z.output<typeof SendTransferReceipt>;
export type CreatePayment = z.output<typeof CreatePayment>;
export type UpdatePayment = z.output<typeof UpdatePayment>;
export type PaymentFilters = z.output<typeof PaymentFilters>;
