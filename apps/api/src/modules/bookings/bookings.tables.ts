import { BOOKING_SOURCES, BOOKING_STATUSES } from "@turftap/contract";
import { bigint, index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { idColumn, priceColumns, timestampColumns } from "../../lib/db/columns";
import { customers } from "../customers/customers.tables";
import { tenantIdColumn, users } from "../platform/platform.tables";
import { resources } from "../venues/venues.tables";

export const bookingStatus = pgEnum("booking_status", BOOKING_STATUSES);
export const bookingSource = pgEnum("booking_source", BOOKING_SOURCES);

/** Holding bookings may not overlap on one resource; see migration 0015_bookings_no_overlap. */
export const bookings = pgTable(
  "bookings",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    resourceId: bigint("resource_id", { mode: "number" })
      .notNull()
      .references(() => resources.id),
    customerId: bigint("customer_id", { mode: "number" })
      .notNull()
      .references(() => customers.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatus("status").notNull(),
    source: bookingSource("source").notNull(),
    ...priceColumns(),
    /** Cents to pay online when booking, in the price's currency. */
    amountDue: bigint("amount_due", { mode: "number" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancellationCutOffHours: integer("cancellation_cut_off_hours").notNull(),
    cancelReason: text("cancel_reason"),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    ...timestampColumns(),
  },
  (table) => [
    index("bookings_tenant_idx").on(table.tenantId),
    index("bookings_resource_starts_at_idx").on(table.resourceId, table.startsAt),
  ],
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBooking = Omit<typeof bookings.$inferInsert, "id" | "tenantId">;
