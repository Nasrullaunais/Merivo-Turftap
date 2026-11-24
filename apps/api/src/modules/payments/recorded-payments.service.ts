import type { Money } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import * as eventsService from "../notifications/events.service";
import * as paymentsRepository from "./payments.repository";

/**
 * What bookings and memberships need from payments. Lives outside payments.service, which uses
 * them, so they can call it without an import circle.
 */

export type PaidFor = { bookingId: number } | { membershipId: number };

/** Cents paid on each booking, less refunds. */
export async function paidFor(auth: AuthContext, bookingIds: number[]) {
  const paid = await paymentsRepository.paidBy(auth.tenantId, "bookingId", bookingIds);
  return (bookingId: number) => paid.get(bookingId) ?? 0;
}

/** Cents paid on each membership, less refunds. */
export async function paidForMemberships(auth: AuthContext, membershipIds: number[]) {
  const paid = await paymentsRepository.paidBy(auth.tenantId, "membershipId", membershipIds);
  return (membershipId: number) => paid.get(membershipId) ?? 0;
}

/** BKG-04, MEM-03: the full price paid in cash at the desk, in the transaction that saves the sale. */
export async function recordWalkInCash(
  auth: AuthContext,
  paidFor: PaidFor,
  sale: { venueId: number; price: Money },
) {
  const payment = await paymentsRepository.insert(auth.tenantId, {
    ...paidFor,
    venueId: sale.venueId,
    kind: "CASH",
    status: "ACCEPTED",
    amount: sale.price.amount,
    currency: sale.price.currency,
    note: null,
    createdBy: auth.userId ?? null,
  });
  eventsService.publish(auth, "payment.changed", payment);
}
