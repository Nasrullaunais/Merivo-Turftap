import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { addDays, describeDate, todayIn } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import * as eventsService from "../notifications/events.service";
import * as notificationsService from "../notifications/notifications.service";
import * as usersService from "../platform/users.service";
import * as venuesService from "../venues/venues.service";
import * as membershipsRepository from "./memberships.repository";

export const MEMBERSHIP_REMINDER_DAYS = 3;

/** Runs `work` for each venue with active memberships in each tenant that is on. */
async function eachVenue(
  work: (auth: AuthContext, venue: Awaited<ReturnType<typeof venuesService.get>>) => Promise<void>,
) {
  for (const tenantId of await usersService.activeTenantIds()) {
    const auth: AuthContext = { actor: "system", tenantId };
    for (const venueId of await membershipsRepository.venueIdsWithActive(tenantId)) {
      await work(auth, await venuesService.get(auth, venueId));
    }
  }
}

/** MEM-06: active memberships past their last day, on the venue's clock, become `ENDED`. */
export function endPast() {
  return eachVenue((auth, venue) =>
    transaction(async () => {
      const today = todayIn(venue.timeZone);
      const ended = await membershipsRepository.endPast(auth.tenantId, venue.id, today);
      for (const membership of ended) eventsService.publish(auth, "membership.changed", membership);
    }),
  );
}

/** MEM-06: a WhatsApp to each customer whose membership ends within the next few days. */
export function remindEndingSoon() {
  return eachVenue(async (auth, venue) => {
    if (!venue.active) return;
    await transaction(async () => {
      const today = todayIn(venue.timeZone);
      const endingSoon = await membershipsRepository.markEndingSoon(
        auth.tenantId,
        venue.id,
        today,
        addDays(today, MEMBERSHIP_REMINDER_DAYS),
        MEMBERSHIP_REMINDER_DAYS,
      );
      for (const membership of endingSoon) {
        await notificationsService.notifyCustomer(auth, {
          customerId: membership.customerId,
          template: WHATSAPP_TEMPLATES.membershipEndingSoon,
          values: [venue.name, membership.planName, describeDate(membership.endsOn)],
        });
      }
    });
  });
}
