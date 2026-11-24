import type { AuthContext } from "../../lib/auth/context";
import { describeInstant } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import * as notificationsService from "../notifications/notifications.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as bookingsRepository from "./bookings.repository";

/**
 * BKG-10: the reminder goes out only if the booking is still confirmed.
 * Kept apart from bookings.service, which queues it.
 */
export async function remind(tenantId: number, bookingId: number) {
  const auth: AuthContext = { actor: "system", tenantId };
  const booking = await bookingsRepository.findById(tenantId, bookingId, { venueIds: undefined });
  if (booking?.status !== "CONFIRMED") return;
  const [venue, resource] = await Promise.all([
    venuesService.get(auth, booking.venueId),
    resourcesService.get(auth, booking.resourceId),
  ]);
  await notificationsService.notifyCustomer(auth, {
    customerId: booking.customerId,
    template: WHATSAPP_TEMPLATES.bookingReminder,
    values: [venue.name, resource.name, describeInstant(booking.startsAt, venue.timeZone)],
  });
}
