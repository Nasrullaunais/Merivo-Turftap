import {
  CHECK_IN_UNDO_MINUTES,
  type CheckInFilters,
  type CheckInRefusal,
  checkInRefusal,
  type CreateCheckIn,
  type Membership,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import { describeClock, describeDate, todayIn } from "../../lib/time";
import * as customersService from "../customers/customers.service";
import * as eventsService from "../notifications/events.service";
import * as venuesService from "../venues/venues.service";
import * as checkInsRepository from "./check-ins.repository";
import { membershipErrors } from "./memberships.errors";
import * as membershipsService from "./memberships.service";

type CheckInSort = "checkedInAt";
type StoredCheckIn = NonNullable<Awaited<ReturnType<typeof checkInsRepository.findById>>>;

const MS_PER_MINUTE = 60 * 1000;

const REFUSED: Record<CheckInRefusal, (membership: Membership) => Error> = {
  NOT_PAID: () => membershipErrors.notPaid(),
  BALANCE_OWED: () => membershipErrors.balanceOwed(),
  NOT_STARTED: (membership) => membershipErrors.notStarted(describeDate(membership.startsOn)),
  ENDED: (membership) => membershipErrors.ended(describeDate(membership.endsOn)),
  CANCELLED: () => membershipErrors.cancelled(),
};

/** Read as the system, so a venue turned off since still gives its time zone. */
const venueOf = (auth: AuthContext, venueId: number) =>
  venuesService.get({ actor: "system", tenantId: auth.tenantId }, venueId);

async function withContacts(auth: AuthContext, checkIns: StoredCheckIn[]) {
  const contacts = await customersService.contactsOf(
    auth.tenantId,
    checkIns.map((checkIn) => checkIn.customerId),
  );
  return checkIns.map((checkIn) => {
    const contact = contacts.get(checkIn.customerId)!;
    return { ...checkIn, customerName: contact.name, customerPhone: contact.phone };
  });
}

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<CheckInFilters, CheckInSort>,
) {
  const found = await checkInsRepository.list(auth.tenantId, auth.venueIds, filters, page);
  return { ...found, content: await withContacts(auth, found.content) };
}

export async function get(auth: AuthContext, id: number) {
  const checkIn = await checkInsRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!checkIn) throw membershipErrors.checkInNotFound(id);
  const [withContact] = await withContacts(auth, [checkIn]);
  return withContact!;
}

/**
 * MEM-05: only a membership that can be used today lets the customer in. The membership stays
 * locked until the check-in is saved, so two taps at once count once where one a day is allowed.
 */
export function create(auth: AuthContext, { membershipId }: CreateCheckIn) {
  return transaction(async () => {
    const membership = await membershipsService.get(auth, membershipId, "update");
    const venue = await venueOf(auth, membership.venueId);
    const now = new Date();
    const today = todayIn(venue.timeZone, now);
    const refusal = checkInRefusal(membership, today);
    if (refusal) throw REFUSED[refusal](membership);
    if (!venue.repeatCheckIns) {
      const earlier = await checkInsRepository.latestOn(auth.tenantId, membership.id, today);
      if (earlier) throw membershipErrors.alreadyCheckedIn(describeClock(earlier, venue.timeZone));
    }
    const checkIn = await checkInsRepository.insert(auth.tenantId, {
      venueId: membership.venueId,
      membershipId: membership.id,
      checkedInOn: today,
      checkedInAt: now,
      createdBy: auth.userId ?? null,
    });
    eventsService.publish(auth, "check-in.changed", checkIn);
    const [withContact] = await withContacts(auth, [checkIn]);
    return withContact!;
  });
}

/** A check-in made by mistake can be undone for a few minutes, then it stays. */
export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    const notBefore = new Date(Date.now() - CHECK_IN_UNDO_MINUTES * MS_PER_MINUTE);
    const removed = await checkInsRepository.removeIfAfter(
      auth.tenantId,
      id,
      auth.venueIds,
      notBefore,
    );
    if (removed) return eventsService.publish(auth, "check-in.changed", removed);
    await get(auth, id);
    throw membershipErrors.tooLateToUndo(CHECK_IN_UNDO_MINUTES);
  });
}
