import type { CreateVenue, UpdateVenue } from "@turftap/contract";
import { and, eq, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { venues } from "./venues.tables";

const SORTABLE = { name: sql`lower(${venues.name})`, createdAt: venues.createdAt };

const ownedBy = (tenantId: number, id: number) =>
  and(eq(venues.tenantId, tenantId), eq(venues.id, id));

export async function findById(tenantId: number, id: number) {
  const [venue] = await db().select().from(venues).where(ownedBy(tenantId, id));
  return venue;
}

export function list(
  tenantId: number,
  filters: { active?: boolean },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(venues.tenantId, tenantId)];
  if (filters.active !== undefined) conditions.push(eq(venues.active, filters.active));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(venues)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, venues.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(venues, where),
  );
}

export async function insert(tenantId: number, values: CreateVenue) {
  const [venue] = await db()
    .insert(venues)
    .values({ ...values, tenantId })
    .returning();
  return venue!;
}

export async function update(tenantId: number, id: number, values: UpdateVenue) {
  const [venue] = await db().update(venues).set(values).where(ownedBy(tenantId, id)).returning();
  return venue;
}

/** Turns the venue off instead of deleting it, so its history stays. */
export async function deactivate(tenantId: number, id: number) {
  const changed = await db()
    .update(venues)
    .set({ active: false })
    .where(ownedBy(tenantId, id))
    .returning({ id: venues.id });
  return changed.length > 0;
}
