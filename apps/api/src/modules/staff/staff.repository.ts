import { and, eq, exists, inArray, or } from "drizzle-orm";

import type { StaffRole } from "../../lib/auth/context";
import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { staff, staffVenues } from "./staff.tables";

const SORTABLE = { createdAt: staff.createdAt };

const ownedBy = (tenantId: number, id: number) =>
  and(eq(staff.tenantId, tenantId), eq(staff.id, id));

/** Staff who work at one of these venues, or at every venue. No list means no limit. */
const sharingVenues = (venueIds: number[] | undefined) =>
  venueIds &&
  or(
    eq(staff.allVenues, true),
    exists(
      db()
        .select()
        .from(staffVenues)
        .where(and(eq(staffVenues.staffId, staff.id), inArray(staffVenues.venueId, venueIds))),
    ),
  );

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [row] = await db()
    .select()
    .from(staff)
    .where(and(ownedBy(tenantId, id), sharingVenues(venueIds)));
  return row;
}

export async function findByUser(tenantId: number, userId: number) {
  const [row] = await db()
    .select()
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.userId, userId)));
  return row;
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const where = and(eq(staff.tenantId, tenantId), sharingVenues(venueIds));
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

/** The venues each of these staff members is limited to, by staff id. */
export async function findVenueIds(tenantId: number, staffIds: number[]) {
  const rows = await db()
    .select()
    .from(staffVenues)
    .where(and(eq(staffVenues.tenantId, tenantId), inArray(staffVenues.staffId, staffIds)))
    .orderBy(staffVenues.venueId);
  const byStaff = new Map<number, number[]>();
  for (const row of rows)
    byStaff.set(row.staffId, [...(byStaff.get(row.staffId) ?? []), row.venueId]);
  return byStaff;
}

export async function insert(
  tenantId: number,
  values: { userId: number; role: StaffRole; allVenues: boolean },
) {
  const [row] = await db()
    .insert(staff)
    .values({ ...values, tenantId })
    .returning();
  return row!;
}

export async function replaceVenues(tenantId: number, staffId: number, venueIds: number[]) {
  await db()
    .delete(staffVenues)
    .where(and(eq(staffVenues.tenantId, tenantId), eq(staffVenues.staffId, staffId)));
  if (venueIds.length === 0) return;
  await db()
    .insert(staffVenues)
    .values(venueIds.map((venueId) => ({ tenantId, staffId, venueId })));
}

/** Locks the tenant's Owners until the transaction ends, so two changes can't remove the last one. */
export function lockOwners(tenantId: number) {
  return db()
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.role, "OWNER")))
    .for("update");
}

/** Changes the row only if its role is still `from`, so a change made meanwhile isn't lost. */
export async function update(
  tenantId: number,
  id: number,
  from: StaffRole,
  values: { role: StaffRole; allVenues: boolean },
) {
  const [row] = await db()
    .update(staff)
    .set(values)
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
