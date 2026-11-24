import { BOOKING_SOURCES, BOOKING_STATUSES, REPEAT_SERIES_STATUSES } from "@turftap/contract";
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, priceColumns, timestampColumns } from "../../lib/db/columns";
import { customers } from "../customers/customers.tables";
import { tenantIdColumn, users } from "../platform/platform.tables";
import { resources, venues } from "../venues/venues.tables";

export const bookingStatus = pgEnum("booking_status", BOOKING_STATUSES);
export const bookingSource = pgEnum("booking_source", BOOKING_SOURCES);
export const repeatSeriesStatus = pgEnum("repeat_series_status", REPEAT_SERIES_STATUSES);

export const repeatSeries = pgTable(
  "repeat_series",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    resourceId: bigint("resource_id", { mode: "number" })
      .notNull()
      .references(() => resources.id),
    customerId: bigint("customer_id", { mode: "number" })
      .notNull()
      .references(() => customers.id),
    firstDate: date("first_date", { mode: "string" }).notNull(),
    startMinute: integer("start_minute").notNull(),
    slots: integer("slots").notNull(),
    weeks: integer("weeks").notNull(),
    status: repeatSeriesStatus("status").notNull(),
    cancelReason: text("cancel_reason"),
    seriesPaymentDaysBefore: integer("series_payment_days_before").notNull(),
    advancePercent: integer("advance_percent").notNull(),
    ...timestampColumns(),
  },
  (table) => [
    index("repeat_series_tenant_idx").on(table.tenantId),
    index("repeat_series_venue_idx").on(table.venueId),
  ],
);

export type RepeatSeriesRow = typeof repeatSeries.$inferSelect;
export type NewRepeatSeries = Omit<typeof repeatSeries.$inferInsert, "id" | "tenantId">;

/** Holding bookings may not overlap on one resource; see migration 0015_bookings_no_overlap. */
export const bookings = pgTable(
  "bookings",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    /** The resource's venue, kept here so staff limited to some venues can be filtered directly. */
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    resourceId: bigint("resource_id", { mode: "number" })
      .notNull()
      .references(() => resources.id),
    customerId: bigint("customer_id", { mode: "number" })
      .notNull()
      .references(() => customers.id),
    repeatSeriesId: bigint("repeat_series_id", { mode: "number" }).references(
      () => repeatSeries.id,
    ),
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
    index("bookings_venue_starts_at_idx").on(table.venueId, table.startsAt),
    index("bookings_resource_starts_at_idx").on(table.resourceId, table.startsAt),
    index("bookings_repeat_series_idx").on(table.repeatSeriesId),
    // D-07: one booking waiting for payment per customer per tenant.
    uniqueIndex("bookings_one_awaiting_payment")
      .on(table.tenantId, table.customerId)
      .where(sql`${table.status} = 'AWAITING_PAYMENT'`),
  ],
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBooking = Omit<typeof bookings.$inferInsert, "id" | "tenantId">;
