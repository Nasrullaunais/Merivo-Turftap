import type { CreateCustomer, UpdateCustomer } from "@turftap/contract";
import { and, eq, ilike, like, or, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { customers } from "./customers.tables";

const SORTABLE = { name: sql`lower(${customers.name})`, createdAt: customers.createdAt };

/** `search` matches part of the name, or `phoneDigits` anywhere in the phone number. */
export type CustomerQuery = { phone?: string; search?: { name: string; phoneDigits?: string } };

/** A LIKE pattern matching `text` anywhere, with `%` and `_` taken literally. */
const containing = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;

const ownedBy = (tenantId: number, id: number) =>
  and(eq(customers.tenantId, tenantId), eq(customers.id, id));

export async function findById(tenantId: number, id: number) {
  const [customer] = await db().select().from(customers).where(ownedBy(tenantId, id));
  return customer;
}

export async function findByPhone(tenantId: number, phone: string) {
  const [customer] = await db()
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)));
  return customer;
}

export function list(
  tenantId: number,
  { phone, search }: CustomerQuery,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(customers.tenantId, tenantId)];
  if (phone) conditions.push(eq(customers.phone, phone));
  if (search)
    conditions.push(
      or(
        ilike(customers.name, containing(search.name)),
        search.phoneDigits ? like(customers.phone, containing(search.phoneDigits)) : undefined,
      ),
    );
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(customers)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, customers.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(customers, where),
  );
}

export async function insert(tenantId: number, values: CreateCustomer) {
  const [customer] = await db()
    .insert(customers)
    .values({ ...values, tenantId })
    .returning();
  return customer!;
}

/** Inserts the customer unless one with this phone exists; then returns nothing. */
export async function insertIfPhoneIsNew(tenantId: number, values: CreateCustomer) {
  const [customer] = await db()
    .insert(customers)
    .values({ ...values, tenantId })
    .onConflictDoNothing({ target: [customers.tenantId, customers.phone] })
    .returning();
  return customer;
}

export async function update(tenantId: number, id: number, values: UpdateCustomer) {
  const [customer] = await db()
    .update(customers)
    .set(values)
    .where(ownedBy(tenantId, id))
    .returning();
  return customer;
}
