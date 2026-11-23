import type { CreateClosedDate, UpdateClosedDate } from "@turftap/contract";
import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { closedDates } from "./venues.tables";

const SORTABLE = { date: closedDates.date, createdAt: closedDates.createdAt };

/** No list means the caller may use every venue in the tenant. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds && inArray(closedDates.venueId, venueIds);

const ownedBy = (tenantId: number, id: number, venueIds: number[] | undefined) =>
  and(eq(closedDates.tenantId, tenantId), eq(closedDates.id, id), inVenues(venueIds));

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [closedDate] = await db()
    .select()
    .from(closedDates)
    .where(ownedBy(tenantId, id, venueIds));
  return closedDate;
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: { venueId?: number; from?: string; to?: string },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(closedDates.tenantId, tenantId), inVenues(venueIds)];
  if (filters.venueId !== undefined) conditions.push(eq(closedDates.venueId, filters.venueId));
  if (filters.from !== undefined) conditions.push(gte(closedDates.date, filters.from));
  if (filters.to !== undefined) conditions.push(lte(closedDates.date, filters.to));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(closedDates)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, closedDates.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(closedDates, where),
  );
}

export async function exists(tenantId: number, venueId: number, date: string) {
  const count = await db().$count(
    closedDates,
    and(
      eq(closedDates.tenantId, tenantId),
      eq(closedDates.venueId, venueId),
      eq(closedDates.date, date),
    ),
  );
  return count > 0;
}

export async function insert(tenantId: number, values: CreateClosedDate) {
  const [closedDate] = await db()
    .insert(closedDates)
    .values({ ...values, tenantId })
    .returning();
  return closedDate!;
}

export async function update(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  values: UpdateClosedDate,
) {
  const [closedDate] = await db()
    .update(closedDates)
    .set(values)
    .where(ownedBy(tenantId, id, venueIds))
    .returning();
  return closedDate;
}

/** Reopens the date. Nothing else refers to a Closed Date, so the row is deleted. */
export async function remove(tenantId: number, id: number, venueIds: number[] | undefined) {
  const removed = await db()
    .delete(closedDates)
    .where(ownedBy(tenantId, id, venueIds))
    .returning({ id: closedDates.id });
  return removed.length > 0;
}
