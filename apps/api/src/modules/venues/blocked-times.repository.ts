import { and, eq, gt, inArray, lt, ne, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { blockedTimes, resources } from "./venues.tables";

const SORTABLE = { startsAt: blockedTimes.startsAt, createdAt: blockedTimes.createdAt };

type BlockedTimeFields = { startsAt: Date; endsAt: Date; reason: string | null };

/** Blocks on resources at these venues. No list means the caller may use every venue. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds &&
  inArray(
    blockedTimes.resourceId,
    db().select({ id: resources.id }).from(resources).where(inArray(resources.venueId, venueIds)),
  );

const ownedBy = (tenantId: number, id: number, venueIds: number[] | undefined) =>
  and(eq(blockedTimes.tenantId, tenantId), eq(blockedTimes.id, id), inVenues(venueIds));

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [block] = await db()
    .select()
    .from(blockedTimes)
    .where(ownedBy(tenantId, id, venueIds));
  return block;
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: { resourceId?: number; from?: Date; to?: Date },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(blockedTimes.tenantId, tenantId), inVenues(venueIds)];
  if (filters.resourceId !== undefined)
    conditions.push(eq(blockedTimes.resourceId, filters.resourceId));
  if (filters.from !== undefined) conditions.push(gt(blockedTimes.endsAt, filters.from));
  if (filters.to !== undefined) conditions.push(lt(blockedTimes.startsAt, filters.to));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(blockedTimes)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, blockedTimes.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(blockedTimes, where),
  );
}

/** The same test as the blocked_times_no_overlap constraint. */
export async function findOverlap(
  tenantId: number,
  resourceId: number,
  window: { startsAt: Date; endsAt: Date },
  exceptId?: number,
) {
  const [block] = await db()
    .select()
    .from(blockedTimes)
    .where(
      and(
        eq(blockedTimes.tenantId, tenantId),
        eq(blockedTimes.resourceId, resourceId),
        exceptId === undefined ? undefined : ne(blockedTimes.id, exceptId),
        sql`tstzrange(${blockedTimes.startsAt}, ${blockedTimes.endsAt}) && tstzrange(${window.startsAt.toISOString()}::timestamptz, ${window.endsAt.toISOString()}::timestamptz)`,
      ),
    )
    .limit(1);
  return block;
}

export function listOverlapping(
  tenantId: number,
  resourceId: number,
  window: { startsAt: Date; endsAt: Date },
) {
  return db()
    .select()
    .from(blockedTimes)
    .where(
      and(
        eq(blockedTimes.tenantId, tenantId),
        eq(blockedTimes.resourceId, resourceId),
        lt(blockedTimes.startsAt, window.endsAt),
        gt(blockedTimes.endsAt, window.startsAt),
      ),
    );
}

export async function insert(tenantId: number, values: BlockedTimeFields & { resourceId: number }) {
  const [block] = await db()
    .insert(blockedTimes)
    .values({ ...values, tenantId })
    .returning();
  return block!;
}

export async function update(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  values: BlockedTimeFields,
) {
  const [block] = await db()
    .update(blockedTimes)
    .set(values)
    .where(ownedBy(tenantId, id, venueIds))
    .returning();
  return block;
}

/** Unblocks the time. Nothing else refers to a Blocked Time, so the row is deleted. */
export async function remove(tenantId: number, id: number, venueIds: number[] | undefined) {
  const removed = await db()
    .delete(blockedTimes)
    .where(ownedBy(tenantId, id, venueIds))
    .returning({ id: blockedTimes.id });
  return removed.length > 0;
}
