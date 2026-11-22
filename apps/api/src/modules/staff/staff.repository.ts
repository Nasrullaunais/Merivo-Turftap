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

/** Locks the tenant's Owners until the transaction ends, so two changes can't remove the last one. */
export function lockOwners(tenantId: number) {
  return db()
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.role, "OWNER")))
    .for("update");
}

export async function updateRole(tenantId: number, id: number, from: StaffRole, to: StaffRole) {
  const [row] = await db()
    .update(staff)
    .set({ role: to })
    .where(and(ownedBy(tenantId, id), eq(staff.role, from)))
    .returning();
  return row;
}

export async function remove(tenantId: number, id: number, role: StaffRole) {
  const removed = await db()
    .delete(staff)
    .where(and(ownedBy(tenantId, id), eq(staff.role, role)))
    .returning({ id: staff.id });
  return removed.length > 0;
}

export async function findRolesAcrossTenants(userId: number) {
  return db()
    .select({ tenantId: staff.tenantId, role: staff.role })
    .from(staff)
    .where(eq(staff.userId, userId));
}
