import { FILE_PURPOSES } from "@turftap/contract";
import { bigint, index, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "../../lib/db/columns";
import { customers } from "../customers/customers.tables";
import { tenantIdColumn, users } from "../platform/platform.tables";

export const filePurpose = pgEnum("file_purpose", FILE_PURPOSES);

export const files = pgTable(
  "files",
  {
    id: idColumn(),
    tenantId: tenantIdColumn(),
    purpose: filePurpose("purpose").notNull(),
    /** Where ObjectStorage keeps it: `<tenantId>/<folder>/<uuid>.<extension>`. */
    key: text("key").notNull().unique("files_key_unique"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Receipts only: the hex SHA-256 of the bytes, to spot the same image sent twice (PAY-06). */
    sha256: text("sha256"),
    /** Who uploaded it: a customer (also through the Assistant), or a staff user. */
    customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    ...timestampColumns(),
  },
  (table) => [
    index("files_tenant_idx").on(table.tenantId),
    index("files_tenant_sha256_idx").on(table.tenantId, table.sha256),
  ],
);

export type FileRow = typeof files.$inferSelect;
