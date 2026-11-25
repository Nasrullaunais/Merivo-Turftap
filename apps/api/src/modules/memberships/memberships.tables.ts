import { MEMBERSHIP_STATUSES, PLAN_LENGTH_UNITS } from "@turftap/contract";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
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
import { venues } from "../venues/venues.tables";

export const planLengthUnit = pgEnum("plan_length_unit", PLAN_LENGTH_UNITS);
export const membershipStatus = pgEnum("membership_status", MEMBERSHIP_STATUSES);

export const membershipPlans = pgTable(
  "membership_plans",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    name: text("name").notNull(),
    lengthCount: integer("length_count").notNull(),
    lengthUnit: planLengthUnit("length_unit").notNull(),
    ...priceColumns(),
    active: boolean("active").notNull().default(true),
    ...timestampColumns(),
  },
  (table) => [
    index("membership_plans_tenant_idx").on(table.tenantId),
    index("membership_plans_venue_idx").on(table.venueId),
    uniqueIndex("membership_plans_venue_name_unique")
      .on(table.venueId, sql`lower(${table.name})`)
      .where(sql`${table.active}`),
    check("membership_plans_length_positive", sql`${table.lengthCount} > 0`),
  ],
);

export type MembershipPlanRow = typeof membershipPlans.$inferSelect;

/** One customer may not hold one plan twice on the same day; see migration 0024_memberships. */
export const memberships = pgTable(
  "memberships",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    /** The plan's venue, kept here so staff limited to some venues can be filtered directly. */
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    planId: bigint("plan_id", { mode: "number" })
      .notNull()
      .references(() => membershipPlans.id),
    customerId: bigint("customer_id", { mode: "number" })
      .notNull()
      .references(() => customers.id),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    status: membershipStatus("status").notNull(),
    ...priceColumns(),
    /** Cents to pay online when buying, in the price's currency. */
    amountDue: bigint("amount_due", { mode: "number" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    ...timestampColumns(),
  },
  (table) => [
    index("memberships_tenant_idx").on(table.tenantId),
    index("memberships_venue_starts_on_idx").on(table.venueId, table.startsOn),
    index("memberships_customer_idx").on(table.customerId),
    check("memberships_ends_on_or_after_start", sql`${table.endsOn} >= ${table.startsOn}`),
  ],
);

export type MembershipRow = typeof memberships.$inferSelect;
export type NewMembership = Omit<typeof memberships.$inferInsert, "id" | "tenantId">;

/** MEM-05: a customer with a usable membership came in. */
export const checkIns = pgTable(
  "check_ins",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    /** The membership's venue, so staff limited to some venues can be filtered directly. */
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
    membershipId: bigint("membership_id", { mode: "number" })
      .notNull()
      .references(() => memberships.id),
    /** The day on the venue's clock, so "today's check-ins" needs no time zone sums. */
    checkedInOn: date("checked_in_on", { mode: "string" }).notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => [
    index("check_ins_tenant_idx").on(table.tenantId),
    index("check_ins_venue_day_idx").on(table.venueId, table.checkedInOn),
    index("check_ins_membership_day_idx").on(table.membershipId, table.checkedInOn),
  ],
);

export type CheckInRow = typeof checkIns.$inferSelect;
