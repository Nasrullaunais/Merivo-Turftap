import { bigint, boolean, pgTable, text } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "../../lib/db/columns";

export const tenants = pgTable("tenants", {
  id: idColumn(),
  slug: text("slug").notNull().unique("tenants_slug_unique"),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestampColumns(),
});

export const users = pgTable("users", {
  id: idColumn(),
  phone: text("phone").notNull().unique("users_phone_unique"),
  name: text("name"),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  ...timestampColumns(),
});

/** The `tenant_id` column every tenant-owned table starts with. Index it in the table too. */
export const tenantIdColumn = () =>
  bigint("tenant_id", { mode: "number" })
    .notNull()
    .references(() => tenants.id);
