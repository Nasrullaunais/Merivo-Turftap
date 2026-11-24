import { localTimeAt, type RepeatSeriesFilters, type RepeatSeriesStatus } from "@turftap/contract";
import { and, eq, inArray, type SQL } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { type NewRepeatSeries, repeatSeries, type RepeatSeriesRow } from "./bookings.tables";

const SORTABLE = { firstDate: repeatSeries.firstDate, createdAt: repeatSeries.createdAt };

const toRepeatSeries = ({ startMinute, ...row }: RepeatSeriesRow) => ({
  ...row,
  startTime: localTimeAt(startMinute),
});

/** No list means every venue in the tenant. */
const ownedBy = (tenantId: number, venueIds: number[] | undefined) =>
  and(eq(repeatSeries.tenantId, tenantId), venueIds && inArray(repeatSeries.venueId, venueIds));

export async function insert(tenantId: number, values: NewRepeatSeries) {
  const [series] = await db()
    .insert(repeatSeries)
    .values({ ...values, tenantId })
    .returning();
  return toRepeatSeries(series!);
}

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [series] = await db()
    .select()
    .from(repeatSeries)
    .where(and(ownedBy(tenantId, venueIds), eq(repeatSeries.id, id)));
  return series && toRepeatSeries(series);
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: RepeatSeriesFilters,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [ownedBy(tenantId, venueIds)];
  if (filters.venueId !== undefined) conditions.push(eq(repeatSeries.venueId, filters.venueId));
  if (filters.resourceId !== undefined)
    conditions.push(eq(repeatSeries.resourceId, filters.resourceId));
  if (filters.customerId !== undefined)
    conditions.push(eq(repeatSeries.customerId, filters.customerId));
  if (filters.status !== undefined) conditions.push(eq(repeatSeries.status, filters.status));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(repeatSeries)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, repeatSeries.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toRepeatSeries)),
    db().$count(repeatSeries, where),
  );
}

/** Changes the status only if it is still `from`; returns nothing if someone got there first. */
export async function setStatus(
  tenantId: number,
  id: number,
  from: RepeatSeriesStatus,
  to: RepeatSeriesStatus,
  changes: Pick<NewRepeatSeries, "cancelReason"> = {},
) {
  const [series] = await db()
    .update(repeatSeries)
    .set({ ...changes, status: to })
    .where(
      and(
        eq(repeatSeries.tenantId, tenantId),
        eq(repeatSeries.id, id),
        eq(repeatSeries.status, from),
      ),
    )
    .returning();
  return series && toRepeatSeries(series);
}
