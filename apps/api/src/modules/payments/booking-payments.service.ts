import type { Money } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import * as eventsService from "../notifications/events.service";
import * as paymentsRepository from "./payments.repository";

/**
 * What bookings need from payments. Lives outside payments.service, which uses bookings, so
 * bookings can call it without an import circle.
 */

/** Cents paid on each booking, less refunds. */
export async function paidFor(auth: AuthContext, bookingIds: number[]) {
  const paid = await paymentsRepository.paidByBooking(auth.tenantId, bookingIds);
  return (bookingId: number) => paid.get(bookingId) ?? 0;
}

/** BKG-04: a walk-in paid in cash at the desk. Called inside the transaction that saves it. */
export async function recordWalkInCash(
  auth: AuthContext,
  booking: { id: number; venueId: number; price: Money },
) {
  const payment = await paymentsRepository.insert(auth.tenantId, {
    venueId: booking.venueId,
    bookingId: booking.id,
    kind: "CASH",
    status: "ACCEPTED",
    amount: booking.price.amount,
    currency: booking.price.currency,
    note: null,
    createdBy: auth.userId ?? null,
  });
  eventsService.publish(auth, "payment.changed", payment);
}
