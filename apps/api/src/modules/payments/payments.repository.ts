import type { PaymentFilters, PaymentStatus, ReceiptReading } from "@turftap/contract";
import { aliasedTable, and, asc, eq, inArray, lt, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import {
  type NewPayment,
  type NewReceiptReading,
  type PaymentRow,
  payments,
  receiptReadings,
} from "./payments.tables";

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

/** Changes the status only if it is still `from`; returns nothing if someone got there first. */
export async function setStatus(
  tenantId: number,
  id: number,
  from: PaymentStatus,
  to: PaymentStatus,
  changes: Pick<NewPayment, "rejectReason"> = {},
) {
  const [payment] = await db()
    .update(payments)
    .set({ ...changes, status: to })
    .where(and(eq(payments.tenantId, tenantId), eq(payments.id, id), eq(payments.status, from)))
    .returning();
  return payment && toPayment(payment);
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

/** Saves a payment's Receipt Reading once; a second save for the same payment changes nothing. */
export async function insertReading(tenantId: number, values: NewReceiptReading) {
  await db()
    .insert(receiptReadings)
    .values({ ...values, tenantId })
    .onConflictDoNothing();
}

export async function hasReading(tenantId: number, paymentId: number) {
  const where = and(
    eq(receiptReadings.tenantId, tenantId),
    eq(receiptReadings.paymentId, paymentId),
  );
  return (await db().$count(receiptReadings, where)) > 0;
}

/** The earliest payment made before `beforeId` that one of these receipt files paid. */
export async function earliestPaidWithFile(tenantId: number, fileIds: number[], beforeId: number) {
  if (fileIds.length === 0) return undefined;
  const [payment] = await db()
    .select({ id: payments.id, bookingId: payments.bookingId })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        inArray(payments.fileId, fileIds),
        lt(payments.id, beforeId),
      ),
    )
    .orderBy(asc(payments.id))
    .limit(1);
  return payment;
}

/** The earliest payment made before `beforeId` whose receipt was read with this reference. */
export async function earliestReadWithReference(
  tenantId: number,
  reference: string,
  beforeId: number,
) {
  const [payment] = await db()
    .select({ id: payments.id, bookingId: payments.bookingId })
    .from(receiptReadings)
    .innerJoin(payments, eq(payments.id, receiptReadings.paymentId))
    .where(
      and(
        eq(receiptReadings.tenantId, tenantId),
        eq(receiptReadings.reference, reference),
        lt(receiptReadings.paymentId, beforeId),
      ),
    )
    .orderBy(asc(receiptReadings.paymentId))
    .limit(1);
  return payment;
}

const duplicates = aliasedTable(payments, "duplicates");

/** Each payment's Receipt Reading, by payment id. Payments not read yet are left out. */
export async function readingsOf(
  tenantId: number,
  paymentIds: number[],
): Promise<Map<number, ReceiptReading>> {
  if (paymentIds.length === 0) return new Map();
  const rows = await db()
    .select({ reading: receiptReadings, duplicateBookingId: duplicates.bookingId })
    .from(receiptReadings)
    .leftJoin(
      duplicates,
      and(eq(duplicates.tenantId, tenantId), eq(duplicates.id, receiptReadings.duplicateOf)),
    )
    .where(
      and(eq(receiptReadings.tenantId, tenantId), inArray(receiptReadings.paymentId, paymentIds)),
    );
  return new Map(
    rows.map(({ reading: { amount, currency, duplicateOf, ...reading }, duplicateBookingId }) => [
      reading.paymentId,
      {
        unreadable: reading.unreadable,
        amount: amount === null || currency === null ? null : { amount, currency },
        paidOn: reading.paidOn,
        bank: reading.bank,
        reference: reading.reference,
        amountMatches: reading.amountMatches,
        dateRecent: reading.dateRecent,
        referenceNew: reading.referenceNew,
        duplicateOf:
          duplicateOf === null ? null : { paymentId: duplicateOf, bookingId: duplicateBookingId },
      },
    ]),
  );
}
