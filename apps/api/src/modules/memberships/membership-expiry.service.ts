import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { describeDate } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import * as eventsService from "../notifications/events.service";
import * as notificationsService from "../notifications/notifications.service";
import * as venuesService from "../venues/venues.service";
import * as membershipsRepository from "./memberships.repository";

/**
 * MEM-02: a membership not paid within its time limit expires, and the customer is told.
 * Kept apart from memberships.service, which queues it.
 */
export function expire(tenantId: number, membershipId: number) {
  const auth: AuthContext = { actor: "system", tenantId };
  return transaction(async () => {
    const membership = await membershipsRepository.expireIfDue(tenantId, membershipId);
    if (!membership) return;
    eventsService.publish(auth, "membership.changed", membership);
    const venue = await venuesService.get(auth, membership.venueId);
    await notificationsService.notifyCustomer(auth, {
      customerId: membership.customerId,
      template: WHATSAPP_TEMPLATES.membershipExpired,
      values: [venue.name, membership.planName, describeDate(membership.startsOn)],
    });
  });
}
