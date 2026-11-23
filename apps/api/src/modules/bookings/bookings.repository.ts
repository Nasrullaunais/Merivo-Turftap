import { HOLDING_STATUSES } from "@turftap/contract";
import { and, eq, gt, inArray, lt } from "drizzle-orm";

import { db } from "../../lib/db";
import { bookings, type NewBooking } from "./bookings.tables";

export async function insert(tenantId: number, values: NewBooking) {
  const [booking] = await db()
    .insert(bookings)
    .values({ ...values, tenantId })
    .returning();
  return booking!;
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
