import {
  type BankAccount,
  DEFAULT_CANCELLATION_CUT_OFF_HOURS,
  DEFAULT_PAYMENT_TIME_LIMIT_MINUTES,
  FULL_AMOUNT_PERCENT,
  type OpeningHours,
  RESOURCE_TYPES,
} from "@turftap/contract";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, priceColumns, timestampColumns } from "../../lib/db/columns";
import { tenantIdColumn } from "../platform/platform.tables";

export const DEFAULT_TIME_ZONE = "Asia/Colombo";

export const venues = pgTable(
  "venues",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    name: text("name").notNull(),
    description: text("description"),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    timeZone: text("time_zone").notNull().default(DEFAULT_TIME_ZONE),
    openingHours: jsonb("opening_hours").$type<OpeningHours[]>().notNull(),
    bankAccount: jsonb("bank_account").$type<BankAccount>(),
    advancePercent: integer("advance_percent").notNull().default(FULL_AMOUNT_PERCENT),
    paymentTimeLimitMinutes: integer("payment_time_limit_minutes")
      .notNull()
      .default(DEFAULT_PAYMENT_TIME_LIMIT_MINUTES),
    cancellationCutOffHours: integer("cancellation_cut_off_hours")
      .notNull()
      .default(DEFAULT_CANCELLATION_CUT_OFF_HOURS),
    active: boolean("active").notNull().default(true),
    ...timestampColumns(),
  },
  (table) => [
    index("venues_tenant_idx").on(table.tenantId),
    uniqueIndex("venues_tenant_name_unique")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.active}`),
  ],
);

export type VenueRow = typeof venues.$inferSelect;

export const closedDates = pgTable(
  "closed_dates",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    date: date("date", { mode: "string" }).notNull(),
    reason: text("reason"),
    ...timestampColumns(),
  },
  (table) => [
    index("closed_dates_tenant_idx").on(table.tenantId),
    uniqueIndex("closed_dates_venue_date_unique").on(table.venueId, table.date),
  ],
);

export const resourceType = pgEnum("resource_type", RESOURCE_TYPES);

export const resources = pgTable(
  "resources",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    name: text("name").notNull(),
    type: resourceType("type").notNull(),
    slotMinutes: integer("slot_minutes").notNull(),
    ...priceColumns(),
    active: boolean("active").notNull().default(true),
    ...timestampColumns(),
  },
  (table) => [
    index("resources_tenant_idx").on(table.tenantId),
    index("resources_venue_idx").on(table.venueId),
    uniqueIndex("resources_venue_name_unique")
      .on(table.venueId, sql`lower(${table.name})`)
      .where(sql`${table.active}`),
  ],
);

export type ResourceRow = typeof resources.$inferSelect;

/** A rule may not overlap another for the same resource; see migration 0004_price_rules_no_overlap. */
export const priceRules = pgTable(
  "price_rules",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    resourceId: bigint("resource_id", { mode: "number" })
      .notNull()
      .references(() => resources.id),
    weekdays: integer("weekdays").array().notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    ...priceColumns(),
    ...timestampColumns(),
  },
  (table) => [
    index("price_rules_tenant_idx").on(table.tenantId),
    index("price_rules_resource_idx").on(table.resourceId),
  ],
);

export type PriceRuleRow = typeof priceRules.$inferSelect;
