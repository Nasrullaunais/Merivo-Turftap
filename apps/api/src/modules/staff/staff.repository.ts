import { and, eq } from "drizzle-orm";

import type { StaffRole } from "../../lib/auth/context";
import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { staff } from "./staff.tables";

const SORTABLE = { createdAt: staff.createdAt };

const ownedBy = (tenantId: number, id: number) =>
  and(eq(staff.tenantId, tenantId), eq(staff.id, id));

export async function findById(tenantId: number, id: number) {
  const [row] = await db().select().from(staff).where(ownedBy(tenantId, id));
  return row;
}

export async function findByUser(tenantId: number, userId: number) {
  const [row] = await db()
    .select()
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.userId, userId)));
  return row;
}

export function list(tenantId: number, page: PageRequest<keyof typeof SORTABLE>) {
  const where = eq(staff.tenantId, tenantId);
  return pageOf(
    page,
    db()
      .select()
      .from(staff)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, staff.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(staff, where),
  );
}

export async function insert(tenantId: number, values: { userId: number; role: StaffRole }) {
  const [row] = await db()
    .insert(staff)
    .values({ ...values, tenantId })
    .returning();
  return row!;
}

export async function findRolesAcrossTenants(userId: number) {
  return db()
    .select({ tenantId: staff.tenantId, role: staff.role })
    .from(staff)
    .where(eq(staff.userId, userId));
}
