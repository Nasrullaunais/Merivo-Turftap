import type { PaymentFilters } from "@turftap/contract";
import { and, eq, inArray, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { type NewPayment, type PaymentRow, payments } from "./payments.tables";

const SORTABLE = { createdAt: payments.createdAt };

const inVenues = (venueIds: number[] | undefined) =>
  venueIds && inArray(payments.venueId, venueIds);

const toPayment = ({ amount, currency, ...row }: PaymentRow) => ({
  ...row,
  amount: { amount, currency },
});

export async function insert(tenantId: number, values: NewPayment) {
  const [payment] = await db()
    .insert(payments)
    .values({ ...values, tenantId })
    .returning();
  return toPayment(payment!);
}

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [payment] = await db()
    .select()
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.id, id), inVenues(venueIds)));
  return payment && toPayment(payment);
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: PaymentFilters,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(payments.tenantId, tenantId), inVenues(venueIds)];
  if (filters.bookingId !== undefined) conditions.push(eq(payments.bookingId, filters.bookingId));
  if (filters.kind !== undefined) conditions.push(eq(payments.kind, filters.kind));
  if (filters.status !== undefined) conditions.push(eq(payments.status, filters.status));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(payments)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, payments.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toPayment)),
    db().$count(payments, where),
  );
}

/** Each booking's accepted payments added up, in cents. Bookings with none are left out. */
export async function paidByBooking(tenantId: number, bookingIds: number[]) {
  if (bookingIds.length === 0) return new Map<number, number>();
  const rows = await db()
    .select({
      bookingId: payments.bookingId,
      paid: sql<string>`sum(${payments.amount})`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        inArray(payments.bookingId, bookingIds),
        eq(payments.status, "ACCEPTED"),
      ),
    )
    .groupBy(payments.bookingId);
  return new Map(rows.map((row) => [row.bookingId!, Number(row.paid)]));
}
