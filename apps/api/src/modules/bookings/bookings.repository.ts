import { type BookingFilters, type BookingStatus, HOLDING_STATUSES } from "@turftap/contract";
import { and, eq, gt, inArray, lt, type SQL, sql } from "drizzle-orm";

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

export async function findById(tenantId: number, id: number, scope: BookingScope) {
  const [booking] = await db()
    .select()
    .from(bookings)
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id), inScope(scope)));
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
  changes: Pick<NewBooking, "cancelReason"> = {},
) {
  const [booking] = await db()
    .update(bookings)
    .set({ ...changes, status: to })
    .where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id), eq(bookings.status, from)))
    .returning();
  return booking && toBooking(booking);
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
