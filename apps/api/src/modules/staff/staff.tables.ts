import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

import { STAFF_ROLES } from "../../lib/auth/context";
import { idColumn, timestampColumns } from "../../lib/db/columns";
import { tenantIdColumn, users } from "../platform/platform.tables";
import { venues } from "../venues/venues.tables";

export const staffRole = pgEnum("staff_role", STAFF_ROLES);

export const staff = pgTable(
  "staff",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    role: staffRole("role").notNull(),
    /** When false, the staff member works only at the venues listed in staff_venues. */
    allVenues: boolean("all_venues").notNull().default(true),
    ...timestampColumns(),
  },
  (table) => [
    unique("staff_tenant_user_unique").on(table.tenantId, table.userId),
    index("staff_user_idx").on(table.userId),
    check("staff_owner_all_venues", sql`${table.role} <> 'OWNER' OR ${table.allVenues}`),
  ],
);

export type StaffRow = typeof staff.$inferSelect;

export const staffVenues = pgTable(
  "staff_venues",
  {
    tenantId: tenantIdColumn(),
    staffId: bigint("staff_id", { mode: "number" })
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    venueId: bigint("venue_id", { mode: "number" })
      .notNull()
      .references(() => venues.id),
  },
  (table) => [
    primaryKey({ name: "staff_venues_pk", columns: [table.staffId, table.venueId] }),
    index("staff_venues_tenant_idx").on(table.tenantId),
    index("staff_venues_venue_idx").on(table.venueId),
  ],
);
