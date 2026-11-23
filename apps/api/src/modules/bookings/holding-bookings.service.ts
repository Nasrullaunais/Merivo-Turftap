import type { AuthContext } from "../../lib/auth/context";
import * as customersService from "../customers/customers.service";
import * as bookingsRepository from "./bookings.repository";

/**
 * The earliest booking holding the resource in the window. Lives outside bookings.service,
 * which uses venues, so venues can call it without an import circle.
 */
export async function firstInWindow(
  auth: AuthContext,
  resourceId: number,
  window: { startsAt: Date; endsAt: Date },
) {
  const booking = await bookingsRepository.findFirstHolding(auth.tenantId, resourceId, window);
  if (!booking) return undefined;
  const contacts = await customersService.contactsOf(auth.tenantId, [booking.customerId]);
  return { startsAt: booking.startsAt, customerName: contacts.get(booking.customerId)!.name };
}
