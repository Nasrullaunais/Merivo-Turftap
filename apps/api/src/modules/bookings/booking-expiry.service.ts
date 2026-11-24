import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { describeInstant } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import * as eventsService from "../notifications/events.service";
import * as notificationsService from "../notifications/notifications.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as bookingsRepository from "./bookings.repository";

/**
 * BKG-03: an unpaid booking past its time limit frees its slots and the customer is told.
 * Kept apart from bookings.service, which queues it.
 */
export function expire(tenantId: number, bookingId: number) {
  const auth: AuthContext = { actor: "system", tenantId };
  return transaction(async () => {
    const booking = await bookingsRepository.expireIfDue(tenantId, bookingId);
    if (!booking) return;
    eventsService.publish(auth, "booking.changed", booking);
    const [venue, resource] = await Promise.all([
      venuesService.get(auth, booking.venueId),
      resourcesService.get(auth, booking.resourceId),
    ]);
    await notificationsService.notifyCustomer(auth, {
      customerId: booking.customerId,
      template: WHATSAPP_TEMPLATES.bookingExpired,
      values: [venue.name, resource.name, describeInstant(booking.startsAt, venue.timeZone)],
    });
  });
}
