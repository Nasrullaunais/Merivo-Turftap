import { type BookingFilters, type BookingStatus, HOLDING_STATUSES } from "@turftap/contract";
import { and, eq, gt, gte, inArray, lt, lte, ne, notInArray, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { priceOf } from "../../lib/db/columns";
import { type BookingRow, bookings, type NewBooking } from "./bookings.tables";

const SORTABLE = { startsAt: bookings.startsAt, createdAt: bookings.createdAt };

/** Who may see which bookings: staff by venue, customers and the Assistant only their own. */
export type BookingScope = {
  /** No list means every venue in the tenant. */
  venueIds: number[] | undefined;
  /** Set for customers and the Assistant. `null` is a caller with no customer record yet. */
  ownCustomerId?: number | null;
};

function ownedBy(ownCustomerId: number | null | undefined) {
  if (ownCustomerId === undefined) return undefined;
  return ownCustomerId === null ? sql`false` : eq(bookings.customerId, ownCustomerId);
}

const inScope = ({ venueIds, ownCustomerId }: BookingScope) =>
  and(venueIds && inArray(bookings.venueId, venueIds), ownedBy(ownCustomerId));

const toBooking = (row: BookingRow) => ({
  ...row,
  price: priceOf(row),
  amountDue: { amount: row.amountDue, currency: row.priceCurrency },
});

export async function insert(tenantId: number, values: NewBooking) {
  const [booking] = await db()
    .insert(bookings)
    .values({ ...values, tenantId })
    .returning();
  return toBooking(booking!);
}

/** With `lock`, no other transaction can change the row until this one ends. */
export async function findById(tenantId: number, id: number, scope: BookingScope, lock?: "update") {
  const query = db()
    .select()
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id), inScope(scope)));
  const [booking] = await (lock ? query.for(lock) : query);
  return booking && toBooking(booking);
}

export function list(
  tenantId: number,
  scope: BookingScope,
  filters: BookingFilters,
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(bookings.tenantId, tenantId), inScope(scope)];
  if (filters.venueId !== undefined) conditions.push(eq(bookings.venueId, filters.venueId));
  if (filters.resourceId !== undefined)
    conditions.push(eq(bookings.resourceId, filters.resourceId));
  if (filters.customerId !== undefined)
    conditions.push(eq(bookings.customerId, filters.customerId));
  if (filters.repeatSeriesId !== undefined)
    conditions.push(eq(bookings.repeatSeriesId, filters.repeatSeriesId));
  if (filters.status !== undefined) conditions.push(eq(bookings.status, filters.status));
  if (filters.from !== undefined) conditions.push(gt(bookings.endsAt, filters.from));
  if (filters.to !== undefined) conditions.push(lt(bookings.startsAt, filters.to));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(bookings)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, bookings.id))
      .limit(page.size)
      .offset(page.page * page.size)
      .then((rows) => rows.map(toBooking)),
    db().$count(bookings, where),
  );
}

/** Changes the status only if it is still `from`; returns nothing if someone got there first. */
export async function setStatus(
  tenantId: number,
  id: number,
  from: BookingStatus,
  to: BookingStatus,
  changes: Pick<NewBooking, "cancelReason" | "expiresAt"> = {},
) {
  const [booking] = await db()
    .update(bookings)
    .set({ ...changes, status: to })
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id), eq(bookings.status, from)))
    .returning();
  return booking && toBooking(booking);
}

/** BKG-09: cancels the series' bookings that still hold slots and haven't started yet. */
export async function cancelUpcomingInSeries(
  tenantId: number,
  repeatSeriesId: number,
  cancelReason: string,
) {
  const rows = await db()
    .update(bookings)
    .set({ status: "CANCELLED", cancelReason })
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.repeatSeriesId, repeatSeriesId),
        inArray(bookings.status, HOLDING_STATUSES),
        gt(bookings.startsAt, sql`now()`),
      ),
    )
    .returning();
  return rows.map(toBooking).toSorted((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** BKG-03: only a booking still waiting for payment and past its Payment Time Limit expires. */
export async function expireIfDue(tenantId: number, id: number) {
  const [booking] = await db()
    .update(bookings)
    .set({ status: "EXPIRED" })
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.id, id),
        eq(bookings.status, "AWAITING_PAYMENT"),
        lte(bookings.expiresAt, sql`now()`),
      ),
    )
    .returning();
  return booking && toBooking(booking);
}

/** D-07: whether the customer has a booking waiting for payment, other than `exceptId`. */
export async function hasOtherAwaitingPayment(
  tenantId: number,
  customerId: number,
  exceptId: number,
) {
  const where = and(
    eq(bookings.tenantId, tenantId),
    eq(bookings.customerId, customerId),
    eq(bookings.status, "AWAITING_PAYMENT"),
    ne(bookings.id, exceptId),
  );
  return (await db().$count(bookings, where)) > 0;
}

/** Bookings that hold time on the resource inside the window. */
export function listHolding(
  tenantId: number,
  resourceId: number,
  window: { startsAt: Date; endsAt: Date },
) {
  return db()
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.resourceId, resourceId),
        inArray(bookings.status, HOLDING_STATUSES),
        lt(bookings.startsAt, window.endsAt),
        gt(bookings.endsAt, window.startsAt),
      ),
    );
}

/** The earliest booking that holds time on the resource inside the window. */
export async function findFirstHolding(
  tenantId: number,
  resourceId: number,
  window: { startsAt: Date; endsAt: Date },
) {
  const [booking] = await db()
    .select({ startsAt: bookings.startsAt, customerId: bookings.customerId })
    .from(bookings)
    .where(
      and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.resourceId, resourceId),
        inArray(bookings.status, HOLDING_STATUSES),
        lt(bookings.startsAt, window.endsAt),
        gt(bookings.endsAt, window.startsAt),
      ),
    )
    .orderBy(bookings.startsAt)
    .limit(1);
  return booking;
}

/** PLA-04: bookings starting in [from, to) per tenant, leaving out expired and cancelled ones. */
export async function countStartingBetweenAcrossTenants(from: Date, to: Date) {
  const rows = await db()
    .select({ tenantId: bookings.tenantId, count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        gte(bookings.startsAt, from),
        lt(bookings.startsAt, to),
        notInArray(bookings.status, ["EXPIRED", "CANCELLED"]),
      ),
    )
    .groupBy(bookings.tenantId);
  return new Map(rows.map((row) => [row.tenantId, row.count]));
}
