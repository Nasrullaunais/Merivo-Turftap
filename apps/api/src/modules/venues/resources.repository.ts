import type { CreateResource, UpdateResource } from "@turftap/contract";
import { and, eq, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceFields, priceOf } from "../../lib/db/columns";
import { type ResourceRow, resources } from "./venues.tables";

const SORTABLE = { name: sql`lower(${resources.name})`, createdAt: resources.createdAt };

const toResource = (row: ResourceRow) => ({ ...row, price: priceOf(row) });

const ownedBy = (tenantId: number, id: number) =>
  and(eq(resources.tenantId, tenantId), eq(resources.id, id));

export async function findById(tenantId: number, id: number) {
  const [resource] = await db().select().from(resources).where(ownedBy(tenantId, id));
  return resource && toResource(resource);
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
      .offset(page.page * page.size)
      .then((rows) => rows.map(toResource)),
    db().$count(resources, where),
  );
}

export async function insert(tenantId: number, { price, ...values }: CreateResource) {
  const [resource] = await db()
    .insert(resources)
    .values({ ...values, ...priceFields(price), tenantId })
    .returning();
  return toResource(resource!);
}

export async function update(tenantId: number, id: number, { price, ...values }: UpdateResource) {
  const [resource] = await db()
    .update(resources)
    .set({ ...values, ...(price && priceFields(price)) })
    .where(ownedBy(tenantId, id))
    .returning();
  return resource && toResource(resource);
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
