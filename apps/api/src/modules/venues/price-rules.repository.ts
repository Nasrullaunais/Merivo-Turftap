import { type CreatePriceRule, localTimeAt, minuteOfDay } from "@turftap/contract";
import { and, eq, inArray, ne, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceFields, priceOf } from "../../lib/db/columns";
import { type PriceRuleRow, priceRules, resources } from "./venues.tables";

const SORTABLE = { startTime: priceRules.startMinute, createdAt: priceRules.createdAt };

export type PriceRuleFields = Omit<CreatePriceRule, "resourceId">;

const toColumns = ({ weekdays, startTime, endTime, price }: PriceRuleFields) => ({
  weekdays: weekdays.toSorted((a, b) => a - b),
  startMinute: minuteOfDay(startTime),
  endMinute: minuteOfDay(endTime),
  ...priceFields(price),
});

const toPriceRule = (row: PriceRuleRow) => ({
  ...row,
  startTime: localTimeAt(row.startMinute),
  endTime: localTimeAt(row.endMinute),
  price: priceOf(row),
});

/** Rules for resources at these venues. No list means the caller may use every venue. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds &&
  inArray(
    priceRules.resourceId,
    db().select({ id: resources.id }).from(resources).where(inArray(resources.venueId, venueIds)),
  );

const ownedBy = (tenantId: number, id: number, venueIds: number[] | undefined) =>
  and(eq(priceRules.tenantId, tenantId), eq(priceRules.id, id), inVenues(venueIds));

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [rule] = await db()
    .select()
    .from(priceRules)
    .where(ownedBy(tenantId, id, venueIds));
  return rule && toPriceRule(rule);
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: { resourceId?: number },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(priceRules.tenantId, tenantId), inVenues(venueIds)];
  if (filters.resourceId !== undefined)
    conditions.push(eq(priceRules.resourceId, filters.resourceId));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(priceRules)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, priceRules.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toPriceRule)),
    db().$count(priceRules, where),
  );
}

/** The same test as the price_rules_no_overlap constraint: a shared weekday and overlapping hours. */
export async function findOverlap(
  tenantId: number,
  resourceId: number,
  fields: PriceRuleFields,
  exceptId?: number,
) {
  const { weekdays, startMinute, endMinute } = toColumns(fields);
  const [rule] = await db()
    .select()
    .from(priceRules)
    .where(
      and(
        eq(priceRules.tenantId, tenantId),
        eq(priceRules.resourceId, resourceId),
        exceptId === undefined ? undefined : ne(priceRules.id, exceptId),
        sql`${priceRules.weekdays} && ${sql.param(weekdays)}::integer[]`,
        sql`int4range(${priceRules.startMinute}, ${priceRules.endMinute}) && int4range(${startMinute}, ${endMinute})`,
      ),
    )
    .limit(1);
  return rule && toPriceRule(rule);
}

/** A rule of the resource whose start or end isn't on a Start Interval of this many minutes. */
export async function findOffInterval(tenantId: number, resourceId: number, minutes: number) {
  const [rule] = await db()
    .select()
    .from(priceRules)
    .where(
      and(
        eq(priceRules.tenantId, tenantId),
        eq(priceRules.resourceId, resourceId),
        sql`(${priceRules.startMinute} % ${minutes} <> 0 OR ${priceRules.endMinute} % ${minutes} <> 0)`,
      ),
    )
    .orderBy(priceRules.startMinute)
    .limit(1);
  return rule && toPriceRule(rule);
}

export async function insert(tenantId: number, { resourceId, ...fields }: CreatePriceRule) {
  const [rule] = await db()
    .insert(priceRules)
    .values({ tenantId, resourceId, ...toColumns(fields) })
    .returning();
  return toPriceRule(rule!);
}

export async function update(
  tenantId: number,
  id: number,
  venueIds: number[] | undefined,
  fields: PriceRuleFields,
) {
  const [rule] = await db()
    .update(priceRules)
    .set(toColumns(fields))
    .where(ownedBy(tenantId, id, venueIds))
    .returning();
  return rule && toPriceRule(rule);
}

export async function remove(tenantId: number, id: number, venueIds: number[] | undefined) {
  const removed = await db()
    .delete(priceRules)
    .where(ownedBy(tenantId, id, venueIds))
    .returning({ id: priceRules.id });
  return removed.length > 0;
}
