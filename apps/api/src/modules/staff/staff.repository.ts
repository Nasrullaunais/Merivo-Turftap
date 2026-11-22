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

export async function findRolesAcrossTenants(userId: number) {
  return db()
    .select({ tenantId: staff.tenantId, role: staff.role })
    .from(staff)
    .where(eq(staff.userId, userId));
}
