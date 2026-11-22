import type { OpeningHours } from "@turftap/contract";
import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "../../lib/db/columns";
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
