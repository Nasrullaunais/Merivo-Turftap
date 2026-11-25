import { z } from "zod";

import { MAX_CANCEL_REASON_LENGTH, WalkIn } from "./bookings";
import { Id, LocalDate, Money, PhoneNumber, Timestamp } from "./common";
import { BankAccount } from "./venues";

/** D-08: `EXPIRED` is not paid in time, like a booking; `ENDED` is past its end date. */
export const MEMBERSHIP_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_CHECK",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "ENDED",
] as const;
/** Memberships in these states keep their days; one customer can't hold the same plan twice. */
export const MEMBERSHIP_HOLDING_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_CHECK",
  "ACTIVE",
] as const;

export const Membership = z
  .object({
    id: Id,
    venueId: Id,
    planId: Id,
    planName: z.string(),
    customerId: Id,
    customerName: z.string(),
    customerPhone: PhoneNumber,
    /** The first and last day it can be used, both included, in the venue's time zone. */
    startsOn: LocalDate,
    endsOn: LocalDate,
    status: z.enum(MEMBERSHIP_STATUSES),
    /** The plan's price when it was bought. */
    price: Money,
    /** What to pay online now: the full price, or zero when sold at the desk. */
    amountDue: Money,
    /** The accepted payments added up, less refunds. */
    paid: Money,
    /** What is still to pay. Zero once expired or cancelled. */
    balance: Money,
    /** When it expires if no Transfer Receipt arrives. Missing when nothing is due online. */
    expiresAt: Timestamp.nullable(),
    cancelReason: z.string().nullable(),
    /** PAY-01: where to send the money, while it waits for payment. */
    bankAccount: BankAccount.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Membership" });

/**
 * MEM-02, MEM-03: customers buy online; staff sell at the desk and always send `walkIn`.
 * Without `startsOn` it starts today. A renewal (MEM-04) starts after the current one ends.
 */
export const CreateMembership = z
  .object({
    planId: Id,
    startsOn: LocalDate.optional(),
    walkIn: WalkIn.optional(),
  })
  .meta({ id: "CreateMembership" });

/** For now a membership only changes by cancelling. Staff must give a reason. */
export const UpdateMembership = z
  .object({
    status: z.enum(MEMBERSHIP_STATUSES),
    cancelReason: z.string().trim().min(1).max(MAX_CANCEL_REASON_LENGTH).optional(),
  })
  .meta({ id: "UpdateMembership" });

export const MembershipFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  planId: z.coerce.number().pipe(Id).optional(),
  customerId: z.coerce.number().pipe(Id).optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
});

export const MEMBERSHIP_SORT_FIELDS = ["startsOn", "createdAt"] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type Membership = z.output<typeof Membership>;
export type CreateMembership = z.output<typeof CreateMembership>;
export type UpdateMembership = z.output<typeof UpdateMembership>;
export type MembershipFilters = z.output<typeof MembershipFilters>;
