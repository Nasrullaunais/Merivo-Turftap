import { PLAN_LENGTH_UNITS } from "@turftap/contract";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { idColumn, priceColumns, timestampColumns } from "../../lib/db/columns";
import { tenantIdColumn } from "../platform/platform.tables";
import { venues } from "../venues/venues.tables";

export const planLengthUnit = pgEnum("plan_length_unit", PLAN_LENGTH_UNITS);

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
