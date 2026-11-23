import type { FilePurpose } from "@turftap/contract";
import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "../../lib/db";
import { type FileRow, files } from "./files.tables";

type NewFile = Pick<
  FileRow,
  "purpose" | "key" | "contentType" | "sizeBytes" | "sha256" | "customerId" | "createdBy"
>;

export async function insert(tenantId: number, values: NewFile) {
  const [file] = await db()
    .insert(files)
    .values({ ...values, tenantId })
    .returning();
  return file!;
}

export async function findById(tenantId: number, id: number, purpose: FilePurpose) {
  const [file] = await db()
    .select()
    .from(files)
    .where(and(eq(files.tenantId, tenantId), eq(files.id, id), eq(files.purpose, purpose)));
  return file;
}

export function findByIds(tenantId: number, ids: number[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return db()
    .select()
    .from(files)
    .where(and(eq(files.tenantId, tenantId), inArray(files.id, ids)));
}

export async function idsWithSha256(tenantId: number, sha256: string, exceptId: number) {
  const rows = await db()
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.tenantId, tenantId), eq(files.sha256, sha256), ne(files.id, exceptId)));
  return rows.map(({ id }) => id);
}

export async function remove(tenantId: number, id: number) {
  const [file] = await db()
    .delete(files)
    .where(and(eq(files.tenantId, tenantId), eq(files.id, id)))
    .returning();
  return file;
}
