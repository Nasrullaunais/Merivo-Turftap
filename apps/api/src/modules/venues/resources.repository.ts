import type { CreateResource, UpdateResource } from "@turftap/contract";
import { and, eq, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { resources } from "./venues.tables";

const SORTABLE = { name: sql`lower(${resources.name})`, createdAt: resources.createdAt };

const ownedBy = (tenantId: number, id: number) =>
  and(eq(resources.tenantId, tenantId), eq(resources.id, id));

export async function findById(tenantId: number, id: number) {
  const [resource] = await db().select().from(resources).where(ownedBy(tenantId, id));
  return resource;
}

export function list(
  tenantId: number,
  filters: { venueId?: number; active?: boolean },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(resources.tenantId, tenantId)];
  if (filters.venueId !== undefined) conditions.push(eq(resources.venueId, filters.venueId));
  if (filters.active !== undefined) conditions.push(eq(resources.active, filters.active));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(resources)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, resources.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(resources, where),
  );
}

export async function insert(tenantId: number, values: CreateResource) {
  const [resource] = await db()
    .insert(resources)
    .values({ ...values, tenantId })
    .returning();
  return resource!;
}

export async function update(tenantId: number, id: number, values: UpdateResource) {
  const [resource] = await db()
    .update(resources)
    .set(values)
    .where(ownedBy(tenantId, id))
    .returning();
  return resource;
}

/** Turns the resource off instead of deleting it, so its past bookings stay. */
export async function deactivate(tenantId: number, id: number) {
  const changed = await db()
    .update(resources)
    .set({ active: false })
    .where(ownedBy(tenantId, id))
    .returning({ id: resources.id });
  return changed.length > 0;
}
