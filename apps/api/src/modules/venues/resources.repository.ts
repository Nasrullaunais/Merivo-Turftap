import type { CreateResource, UpdateResource } from "@turftap/contract";
import { and, eq, inArray, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceFields, priceOf } from "../../lib/db/columns";
import { type ResourceRow, resources } from "./venues.tables";

const SORTABLE = { name: sql`lower(${resources.name})`, createdAt: resources.createdAt };

const toResource = (row: ResourceRow) => ({ ...row, price: priceOf(row) });

/** No list means the caller may use every venue in the tenant. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds && inArray(resources.venueId, venueIds);

const ownedBy = (tenantId: number, id: number, venueIds: number[] | undefined) =>
  and(eq(resources.tenantId, tenantId), eq(resources.id, id), inVenues(venueIds));

/** With `lock`, no other transaction can change the row until this one ends. */
export async function findById(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  lock?: "update",
) {
  const query = db()
    .select()
    .from(resources)
    .where(ownedBy(tenantId, id, venueIds));
  const [resource] = await (lock ? query.for(lock) : query);
  return resource && toResource(resource);
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: { venueId?: number; active?: boolean },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(resources.tenantId, tenantId), inVenues(venueIds)];
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

export async function update(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  { price, ...values }: UpdateResource,
) {
  const [resource] = await db()
    .update(resources)
    .set({ ...values, ...(price && priceFields(price)) })
    .where(ownedBy(tenantId, id, venueIds))
    .returning();
  return resource && toResource(resource);
}

/** Turns the resource off instead of deleting it, so its past bookings stay. */
export async function deactivate(tenantId: number, id: number, venueIds: number[] | undefined) {
  const changed = await db()
    .update(resources)
    .set({ active: false })
    .where(ownedBy(tenantId, id, venueIds))
    .returning({ id: resources.id });
  return changed.length > 0;
}
