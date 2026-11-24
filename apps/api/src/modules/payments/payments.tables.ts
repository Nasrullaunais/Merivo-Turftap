import { type Currency, PAYMENT_KINDS, PAYMENT_STATUSES } from "@turftap/contract";
import { bigint, boolean, date, index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "../../lib/db/columns";
import { bookings } from "../bookings/bookings.tables";
import { files } from "../files/files.tables";
import { tenantIdColumn, users } from "../platform/platform.tables";
import { venues } from "../venues/venues.tables";

export const paymentKind = pgEnum("payment_kind", PAYMENT_KINDS);
export const paymentStatus = pgEnum("payment_status", PAYMENT_STATUSES);

export const payments = pgTable(
  "payments",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    /** The booking's venue, kept here so staff limited to some venues can be filtered directly. */
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    bookingId: bigint("booking_id", { mode: "number" }).references(() => bookings.id),
    kind: paymentKind("kind").notNull(),
    status: paymentStatus("status").notNull(),
    /** Cents, negative for a refund. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").$type<Currency>().notNull(),
    note: text("note"),
    /** A transfer's receipt. One receipt file pays once. */
    fileId: bigint("file_id", { mode: "number" })
      .references(() => files.id)
      .unique("payments_file_unique"),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    ...timestampColumns(),
  },
  (table) => [
    index("payments_tenant_idx").on(table.tenantId),
    index("payments_booking_idx").on(table.bookingId),
    index("payments_venue_idx").on(table.venueId),
  ],
);

export type PaymentRow = typeof payments.$inferSelect;
export type NewPayment = Omit<typeof payments.$inferInsert, "id" | "tenantId">;

/** PAY-03, PAY-06: the Receipt Reading of a transfer, saved once by the `read-receipt` job. */
export const receiptReadings = pgTable(
  "receipt_readings",
  {
    paymentId: bigint("payment_id", { mode: "number" })
      .primaryKey()
      .references(() => payments.id),
    tenantId: tenantIdColumn(),
    unreadable: boolean("unreadable").notNull(),
    /** Cents. */
    amount: bigint("amount", { mode: "number" }),
    currency: text("currency").$type<Currency>(),
    paidOn: date("paid_on", { mode: "string" }),
    bank: text("bank"),
    /** Upper case without spaces or dashes, so the same reference typed two ways still matches. */
    reference: text("reference"),
    amountMatches: boolean("amount_matches"),
    dateRecent: boolean("date_recent"),
    referenceNew: boolean("reference_new"),
    duplicateOf: bigint("duplicate_of", { mode: "number" }).references(() => payments.id),
    ...timestampColumns(),
  },
  (table) => [index("receipt_readings_tenant_reference_idx").on(table.tenantId, table.reference)],
);

export type ReceiptReadingRow = typeof receiptReadings.$inferSelect;
export type NewReceiptReading = Omit<
  typeof receiptReadings.$inferInsert,
  "tenantId" | "createdAt" | "updatedAt"
>;
