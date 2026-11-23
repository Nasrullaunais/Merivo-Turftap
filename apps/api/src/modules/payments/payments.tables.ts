import { type Currency, PAYMENT_KINDS, PAYMENT_STATUSES } from "@turftap/contract";
import { bigint, index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

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
