import { type OpeningHours, RESOURCE_TYPES } from "@turftap/contract";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
