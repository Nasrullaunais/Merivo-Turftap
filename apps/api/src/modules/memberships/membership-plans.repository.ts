import type { CreateMembershipPlan, UpdateMembershipPlan } from "@turftap/contract";
import { and, eq, inArray, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceFields, priceOf } from "../../lib/db/columns";
import { type MembershipPlanRow, membershipPlans } from "./memberships.tables";

const SORTABLE = {
  name: sql`lower(${membershipPlans.name})`,
  createdAt: membershipPlans.createdAt,
};

const toPlan = (row: MembershipPlanRow) => ({ ...row, price: priceOf(row) });

/** No list means the caller may use every venue in the tenant. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds && inArray(membershipPlans.venueId, venueIds);

const ownedBy = (tenantId: number, id: number, venueIds: number[] | undefined) =>
  and(eq(membershipPlans.tenantId, tenantId), eq(membershipPlans.id, id), inVenues(venueIds));

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [plan] = await db()
    .select()
    .from(membershipPlans)
    .where(ownedBy(tenantId, id, venueIds));
  return plan && toPlan(plan);
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: { venueId?: number; active?: boolean },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [
    eq(membershipPlans.tenantId, tenantId),
    inVenues(venueIds),
  ];
  if (filters.venueId !== undefined) conditions.push(eq(membershipPlans.venueId, filters.venueId));
  if (filters.active !== undefined) conditions.push(eq(membershipPlans.active, filters.active));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(membershipPlans)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, membershipPlans.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toPlan)),
    db().$count(membershipPlans, where),
  );
}

export async function insert(tenantId: number, { price, ...values }: CreateMembershipPlan) {
  const [plan] = await db()
    .insert(membershipPlans)
    .values({ ...values, ...priceFields(price), tenantId })
    .returning();
  return toPlan(plan!);
}

export async function update(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  { price, ...values }: UpdateMembershipPlan,
) {
  const [plan] = await db()
    .update(membershipPlans)
    .set({ ...values, ...(price && priceFields(price)) })
    .where(ownedBy(tenantId, id, venueIds))
    .returning();
  return plan && toPlan(plan);
}

/** Turns the plan off instead of deleting it, so memberships sold on it keep working. */
export async function deactivate(tenantId: number, id: number, venueIds: number[] | undefined) {
  const changed = await db()
    .update(membershipPlans)
    .set({ active: false })
    .where(ownedBy(tenantId, id, venueIds))
    .returning({ id: membershipPlans.id });
  return changed.length > 0;
}
