import { and, eq } from "drizzle-orm";

import { db } from "../../lib/db";
import { staff } from "./staff.tables";

export async function findByUser(tenantId: number, userId: number) {
  const [row] = await db()
    .select()
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.userId, userId)));
  return row;
}
