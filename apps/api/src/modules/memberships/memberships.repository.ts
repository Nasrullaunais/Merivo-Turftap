import type { MembershipFilters, MembershipStatus } from "@turftap/contract";
import {
  aliasedTable,
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceOf } from "../../lib/db/columns";
import {
  membershipPlans,
  type MembershipRow,
  memberships,
  type NewMembership,
} from "./memberships.tables";

const SORTABLE = { startsOn: memberships.startsOn, createdAt: memberships.createdAt };

/** Who may see which memberships: staff by venue, customers and the Assistant only their own. */
export type MembershipScope = {
  /** No list means every venue in the tenant. */
  venueIds: number[] | undefined;
  /** Set for customers and the Assistant. `null` is a caller with no customer record yet. */
  ownCustomerId?: number | null;
};

function ownedBy(ownCustomerId: number | null | undefined) {
  if (ownCustomerId === undefined) return undefined;
  return ownCustomerId === null ? sql`false` : eq(memberships.customerId, ownCustomerId);
}

const inScope = ({ venueIds, ownCustomerId }: MembershipScope) =>
  and(venueIds && inArray(memberships.venueId, venueIds), ownedBy(ownCustomerId));

const withPlanName = { membership: memberships, planName: membershipPlans.name };
const planOf = (tenantId: number) =>
  and(eq(membershipPlans.tenantId, tenantId), eq(membershipPlans.id, memberships.planId));

const toMembership = ({
  membership,
  planName,
}: {
  membership: MembershipRow;
  planName: string;
}) => ({
  ...membership,
  planName,
  price: priceOf(membership),
  amountDue: { amount: membership.amountDue, currency: membership.priceCurrency },
});

async function withPlan(tenantId: number, row: MembershipRow | undefined) {
  if (!row) return undefined;
  const [plan] = await db()
    .select({ name: membershipPlans.name })
    .from(membershipPlans)
    .where(and(eq(membershipPlans.tenantId, tenantId), eq(membershipPlans.id, row.planId)));
  return toMembership({ membership: row, planName: plan!.name });
}

export async function insert(tenantId: number, values: NewMembership) {
  const [membership] = await db()
    .insert(memberships)
    .values({ ...values, tenantId })
    .returning();
  return withPlan(tenantId, membership).then((found) => found!);
}

/** With `lock`, no other transaction can change the row until this one ends. */
export async function findById(
  tenantId: number,
  id: number,
  scope: MembershipScope,
  lock?: "update",
) {
  const query = db()
    .select(withPlanName)
    .from(memberships)
    .innerJoin(membershipPlans, planOf(tenantId))
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.id, id), inScope(scope)));
  const [row] = await (lock ? query.for(lock, { of: memberships }) : query);
  return row && toMembership(row);
}

export function list(
  tenantId: number,
  scope: MembershipScope,
  filters: MembershipFilters,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(memberships.tenantId, tenantId), inScope(scope)];
  if (filters.venueId !== undefined) conditions.push(eq(memberships.venueId, filters.venueId));
  if (filters.planId !== undefined) conditions.push(eq(memberships.planId, filters.planId));
  if (filters.customerId !== undefined)
    conditions.push(eq(memberships.customerId, filters.customerId));
  if (filters.status !== undefined) conditions.push(eq(memberships.status, filters.status));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select(withPlanName)
      .from(memberships)
      .innerJoin(membershipPlans, planOf(tenantId))
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, memberships.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toMembership)),
    db().$count(memberships, where),
  );
}

/** Changes the status only if it is still `from`; returns nothing if someone got there first. */
export async function setStatus(
  tenantId: number,
  id: number,
  from: MembershipStatus,
  to: MembershipStatus,
  changes: Pick<NewMembership, "cancelReason" | "expiresAt"> = {},
) {
  const [membership] = await db()
    .update(memberships)
    .set({ ...changes, status: to })
    .where(
      and(eq(memberships.tenantId, tenantId), eq(memberships.id, id), eq(memberships.status, from)),
    )
    .returning();
  return withPlan(tenantId, membership);
}

/** MEM-02: only a membership still waiting for payment and past its time limit expires. */
export async function expireIfDue(tenantId: number, id: number) {
  const [membership] = await db()
    .update(memberships)
    .set({ status: "EXPIRED" })
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.id, id),
        eq(memberships.status, "AWAITING_PAYMENT"),
        lte(memberships.expiresAt, sql`now()`),
      ),
    )
    .returning();
  return withPlan(tenantId, membership);
}

/** MEM-04: the last day of the customer's active memberships of this plan that end today or later. */
export async function lastActiveDay(
  tenantId: number,
  customerId: number,
  planId: number,
  today: string,
) {
  const [latest] = await db()
    .select({ endsOn: memberships.endsOn })
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.customerId, customerId),
        eq(memberships.planId, planId),
        eq(memberships.status, "ACTIVE"),
        gte(memberships.endsOn, today),
      ),
    )
    .orderBy(desc(memberships.endsOn))
    .limit(1);
  return latest?.endsOn;
}

/** MEM-06: the venues that have active memberships, for the nightly jobs that work venue by venue. */
export async function venueIdsWithActive(tenantId: number) {
  const rows = await db()
    .selectDistinct({ venueId: memberships.venueId })
    .from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.status, "ACTIVE")));
  return rows.map((row) => row.venueId);
}

/** MEM-06: active memberships whose last day was before `today` become `ENDED`. */
export async function endPast(tenantId: number, venueId: number, today: string) {
  return db()
    .update(memberships)
    .set({ status: "ENDED" })
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.venueId, venueId),
        eq(memberships.status, "ACTIVE"),
        lt(memberships.endsOn, today),
      ),
    )
    .returning();
}

const renewals = aliasedTable(memberships, "renewals");
/** D-33: paid or waiting for a receipt check counts as renewed; only waiting to pay doesn't. */
const RENEWED_STATUSES: MembershipStatus[] = ["ACTIVE", "AWAITING_CHECK"];

/**
 * MEM-06: marks active memberships ending after `today` and by `lastDay` that aren't renewed and
 * weren't reminded yet, and returns them. Ones no longer than the reminder window are left out.
 */
export async function markEndingSoon(
  tenantId: number,
  venueId: number,
  today: string,
  lastDay: string,
  reminderDays: number,
) {
  const renewed = db()
    .select({ id: renewals.id })
    .from(renewals)
    .where(
      and(
        eq(renewals.tenantId, tenantId),
        eq(renewals.venueId, venueId),
        eq(renewals.customerId, memberships.customerId),
        inArray(renewals.status, RENEWED_STATUSES),
        gt(renewals.endsOn, memberships.endsOn),
      ),
    );
  const rows = await db()
    .update(memberships)
    .set({ endingReminderSentAt: sql`now()` })
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.venueId, venueId),
        eq(memberships.status, "ACTIVE"),
        isNull(memberships.endingReminderSentAt),
        gt(memberships.endsOn, today),
        lte(memberships.endsOn, lastDay),
        sql`${memberships.endsOn} - ${memberships.startsOn} >= ${reminderDays}`,
        sql`not exists ${renewed}`,
      ),
    )
    .returning();
  return Promise.all(rows.map((row) => withPlan(tenantId, row).then((found) => found!)));
}
