import { bigint, boolean, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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

export const LOGIN_CODE_CHANNELS = ["WHATSAPP", "SMS"] as const;
export type LoginCodeChannel = (typeof LOGIN_CODE_CHANNELS)[number];
export const loginCodeChannel = pgEnum("login_code_channel", LOGIN_CODE_CHANNELS);

export const loginCodeSends = pgTable(
  "login_code_sends",
  {
    id: idColumn(),
    phone: text("phone").notNull(),
    channel: loginCodeChannel("channel").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("login_code_sends_phone_sent_at_idx").on(table.phone, table.sentAt)],
);

/** The `tenant_id` column every tenant-owned table starts with. Index it in the table too. */
export const tenantIdColumn = () =>
  bigint("tenant_id", { mode: "number" })
    .notNull()
    .references(() => tenants.id);
