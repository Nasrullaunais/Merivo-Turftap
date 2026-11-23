import type { Booking, CreatePayment, PaymentFilters, StaffRole } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import * as bookingsService from "../bookings/bookings.service";
import { paymentErrors } from "./payments.errors";
import * as paymentsRepository from "./payments.repository";

type PaymentSort = "createdAt";

/** BKG-08: Front Desk takes cash but doesn't record refunds. */
const MAY_REFUND: readonly StaffRole[] = ["OWNER", "MANAGER"];

export function list(auth: AuthContext, { filters, page }: ListQuery<PaymentFilters, PaymentSort>) {
  return paymentsRepository.list(auth.tenantId, auth.venueIds, filters, page);
}

export async function get(auth: AuthContext, id: number) {
  const payment = await paymentsRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!payment) throw paymentErrors.notFound(id);
  return payment;
}

/** PAY-08: cash pays some or all of a confirmed booking's balance. */
function checkCash(booking: Booking, cents: number) {
  if (booking.status !== "CONFIRMED") throw paymentErrors.cashNeedsConfirmedBooking();
  if (booking.balance.amount <= 0) throw paymentErrors.alreadyFullyPaid();
  if (cents > booking.balance.amount) throw paymentErrors.moreThanBalance();
}

/** BKG-08: a refund on a cancelled booking, up to what was paid for it. */
function checkRefund(booking: Booking, cents: number) {
  if (booking.status !== "CANCELLED") throw paymentErrors.refundNeedsCancelledBooking();
  if (cents > booking.paid.amount) throw paymentErrors.refundMoreThanPaid();
}

/**
 * Cash and refunds are accepted straight away. The booking stays locked from the checks to the
 * insert, so two payments recorded at once can't both fit in the same balance.
 */
export async function create(auth: AuthContext, input: CreatePayment) {
  if (input.kind === "REFUND" && !(auth.role && MAY_REFUND.includes(auth.role)))
    throw paymentErrors.refundNeedsManager();
  return transaction(async () => {
    const booking = await bookingsService.get(auth, input.bookingId, "update");
    const { amount: cents, currency } = input.amount;
    if (currency !== booking.price.currency) throw paymentErrors.wrongCurrency();
    if (input.kind === "CASH") checkCash(booking, cents);
    else checkRefund(booking, cents);
    return paymentsRepository.insert(auth.tenantId, {
      venueId: booking.venueId,
      bookingId: booking.id,
      kind: input.kind,
      status: "ACCEPTED",
      amount: input.kind === "REFUND" ? -cents : cents,
      currency,
      note: input.note,
      createdBy: auth.userId ?? null,
    });
  });
}
