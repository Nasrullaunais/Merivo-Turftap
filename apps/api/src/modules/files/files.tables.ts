import { FILE_PURPOSES } from "@turftap/contract";
import { index, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "../../lib/db/columns";
import { tenantIdColumn } from "../platform/platform.tables";

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
    ...timestampColumns(),
  },
  (table) => [index("files_tenant_idx").on(table.tenantId)],
);

export type FileRow = typeof files.$inferSelect;
