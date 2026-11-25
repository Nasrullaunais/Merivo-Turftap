import { z } from "zod";

import { Id, LocalDate, PhoneNumber, Timestamp } from "./common";
import type { Membership } from "./memberships";

/** Why a membership can't be used today (MEM-05). */
export const CHECK_IN_REFUSALS = [
  "NOT_PAID",
  "BALANCE_OWED",
  "NOT_STARTED",
  "ENDED",
  "CANCELLED",
] as const;

/** Staff may undo a check-in made by mistake for this long. */
export const CHECK_IN_UNDO_MINUTES = 5;

/**
 * MEM-05: only an active membership with nothing left to pay, used between its first and last
 * day, lets the customer in. `today` is the date on the venue's clock.
 */
export function checkInRefusal(
  membership: Pick<Membership, "status" | "startsOn" | "endsOn" | "balance">,
  today: string,
): CheckInRefusal | undefined {
  switch (membership.status) {
    case "CANCELLED":
      return "CANCELLED";
    case "ENDED":
      return "ENDED";
    case "AWAITING_PAYMENT":
    case "AWAITING_CHECK":
    case "EXPIRED":
      return "NOT_PAID";
  }
  if (membership.endsOn < today) return "ENDED";
  if (membership.startsOn > today) return "NOT_STARTED";
  if (membership.balance.amount > 0) return "BALANCE_OWED";
  return undefined;
}

export const CheckIn = z
  .object({
    id: Id,
    venueId: Id,
    membershipId: Id,
    planName: z.string(),
    customerId: Id,
    customerName: z.string(),
    customerPhone: PhoneNumber,
    /** The day on the venue's clock. */
    checkedInOn: LocalDate,
    checkedInAt: Timestamp,
    createdBy: Id.nullable(),
  })
  .meta({ id: "CheckIn" });

export const CreateCheckIn = z.object({ membershipId: Id }).meta({ id: "CreateCheckIn" });

export const CheckInFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  membershipId: z.coerce.number().pipe(Id).optional(),
  /** A day on the venue's clock, such as today. */
  on: LocalDate.optional(),
});

export const CHECK_IN_SORT_FIELDS = ["checkedInAt"] as const;

export type CheckInRefusal = (typeof CHECK_IN_REFUSALS)[number];
export type CheckIn = z.output<typeof CheckIn>;
export type CreateCheckIn = z.output<typeof CreateCheckIn>;
export type CheckInFilters = z.output<typeof CheckInFilters>;
