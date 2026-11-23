import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "../../lib/db/columns";
import { tenantIdColumn } from "../platform/platform.tables";

export const customers = pgTable(
  "customers",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    ...timestampColumns(),
  },
  (table) => [uniqueIndex("customers_tenant_phone_unique").on(table.tenantId, table.phone)],
);

export type CustomerRow = typeof customers.$inferSelect;
