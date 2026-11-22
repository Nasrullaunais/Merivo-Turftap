import { bigint, index, pgEnum, pgTable, unique } from "drizzle-orm/pg-core";

import { STAFF_ROLES } from "../../lib/auth/context";
import { idColumn, timestampColumns } from "../../lib/db/columns";
import { tenantIdColumn, users } from "../platform/platform.tables";

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
    ...timestampColumns(),
  },
  (table) => [
    unique("staff_tenant_user_unique").on(table.tenantId, table.userId),
    index("staff_user_idx").on(table.userId),
  ],
);
