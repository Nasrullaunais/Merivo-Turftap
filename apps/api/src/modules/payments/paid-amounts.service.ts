import type { AuthContext } from "../../lib/auth/context";
import * as paymentsRepository from "./payments.repository";

/**
 * Cents paid on each booking, less refunds. Lives outside payments.service, which uses bookings,
 * so bookings can call it without an import circle.
 */
export async function paidFor(auth: AuthContext, bookingIds: number[]) {
  const paid = await paymentsRepository.paidByBooking(auth.tenantId, bookingIds);
  return (bookingId: number) => paid.get(bookingId) ?? 0;
}
