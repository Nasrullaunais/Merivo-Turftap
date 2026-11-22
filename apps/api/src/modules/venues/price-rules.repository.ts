import type { CreatePriceRule } from "@turftap/contract";
import { and, eq, ne, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceFields, priceOf } from "../../lib/db/columns";
import { type PriceRuleRow, priceRules } from "./venues.tables";

const MINUTES_PER_HOUR = 60;
const SORTABLE = { startTime: priceRules.startMinute, createdAt: priceRules.createdAt };

export type PriceRuleFields = Omit<CreatePriceRule, "resourceId">;

const toMinute = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours! * MINUTES_PER_HOUR + minutes!;
};
const toTime = (minute: number) =>
  [Math.floor(minute / MINUTES_PER_HOUR), minute % MINUTES_PER_HOUR]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

const toColumns = ({ weekdays, startTime, endTime, price }: PriceRuleFields) => ({
  weekdays: weekdays.toSorted((a, b) => a - b),
  startMinute: toMinute(startTime),
  endMinute: toMinute(endTime),
  ...priceFields(price),
});

const toPriceRule = (row: PriceRuleRow) => ({
  ...row,
  startTime: toTime(row.startMinute),
  endTime: toTime(row.endMinute),
  price: priceOf(row),
});

const ownedBy = (tenantId: number, id: number) =>
  and(eq(priceRules.tenantId, tenantId), eq(priceRules.id, id));

export async function findById(tenantId: number, id: number) {
  const [rule] = await db().select().from(priceRules).where(ownedBy(tenantId, id));
  return rule && toPriceRule(rule);
}

export function list(
  tenantId: number,
  filters: { resourceId?: number },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(priceRules.tenantId, tenantId)];
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

export async function insert(tenantId: number, { resourceId, ...fields }: CreatePriceRule) {
  const [rule] = await db()
    .insert(priceRules)
    .values({ tenantId, resourceId, ...toColumns(fields) })
    .returning();
  return toPriceRule(rule!);
}

export async function update(tenantId: number, id: number, fields: PriceRuleFields) {
  const [rule] = await db()
    .update(priceRules)
    .set(toColumns(fields))
    .where(ownedBy(tenantId, id))
    .returning();
  return rule && toPriceRule(rule);
}

export async function remove(tenantId: number, id: number) {
  const removed = await db()
    .delete(priceRules)
    .where(ownedBy(tenantId, id))
    .returning({ id: priceRules.id });
  return removed.length > 0;
}
