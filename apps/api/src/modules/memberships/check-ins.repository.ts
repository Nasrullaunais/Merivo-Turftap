import type { CheckInFilters } from "@turftap/contract";
import { and, desc, eq, gt, inArray, type SQL } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { type CheckInRow, checkIns, membershipPlans, memberships } from "./memberships.tables";

const SORTABLE = { checkedInAt: checkIns.checkedInAt };

type NewCheckIn = Pick<
  CheckInRow,
  "venueId" | "membershipId" | "checkedInOn" | "checkedInAt" | "createdBy"
>;

/** No list means the caller may use every venue in the tenant. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds && inArray(checkIns.venueId, venueIds);

const withMembership = {
  checkIn: checkIns,
  planName: membershipPlans.name,
  customerId: memberships.customerId,
};

const joined = (tenantId: number) =>
  db()
    .select(withMembership)
    .from(checkIns)
    .innerJoin(
      memberships,
      and(eq(memberships.tenantId, tenantId), eq(memberships.id, checkIns.membershipId)),
    )
    .innerJoin(
      membershipPlans,
      and(eq(membershipPlans.tenantId, tenantId), eq(membershipPlans.id, memberships.planId)),
    );

const toCheckIn = ({
  checkIn,
  planName,
  customerId,
}: {
  checkIn: CheckInRow;
  planName: string;
  customerId: number;
}) => ({ ...checkIn, planName, customerId });

export async function insert(tenantId: number, values: NewCheckIn) {
  const [row] = await db()
    .insert(checkIns)
    .values({ ...values, tenantId })
    .returning({ id: checkIns.id });
  return findById(tenantId, row!.id, undefined).then((found) => found!);
}

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [row] = await joined(tenantId).where(
    and(eq(checkIns.tenantId, tenantId), eq(checkIns.id, id), inVenues(venueIds)),
  );
  return row && toCheckIn(row);
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: CheckInFilters,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(checkIns.tenantId, tenantId), inVenues(venueIds)];
  if (filters.venueId !== undefined) conditions.push(eq(checkIns.venueId, filters.venueId));
  if (filters.membershipId !== undefined)
    conditions.push(eq(checkIns.membershipId, filters.membershipId));
  if (filters.on !== undefined) conditions.push(eq(checkIns.checkedInOn, filters.on));
  const where = and(...conditions);
  return pageOf(
    page,
    joined(tenantId)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, checkIns.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toCheckIn)),
    db().$count(checkIns, where),
  );
}

/** The latest check-in of the membership on that day, if any. */
export async function latestOn(tenantId: number, membershipId: number, day: string) {
  const [latest] = await db()
    .select({ checkedInAt: checkIns.checkedInAt })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.tenantId, tenantId),
        eq(checkIns.membershipId, membershipId),
        eq(checkIns.checkedInOn, day),
      ),
    )
    .orderBy(desc(checkIns.checkedInAt))
    .limit(1);
  return latest?.checkedInAt;
}

/** Deletes it only if it was made after `notBefore`; returns whether it did. */
export async function removeIfAfter(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  notBefore: Date,
) {
  const removed = await db()
    .delete(checkIns)
    .where(
      and(
        eq(checkIns.tenantId, tenantId),
        eq(checkIns.id, id),
        inVenues(venueIds),
        gt(checkIns.checkedInAt, notBefore),
      ),
    )
    .returning({ id: checkIns.id, venueId: checkIns.venueId });
  return removed[0];
}
