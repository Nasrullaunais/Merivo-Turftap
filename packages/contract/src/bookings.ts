import { z } from "zod";

import { Id, LocalDate, Money, PhoneInput, PhoneNumber, Timestamp } from "./common";
import { CustomerName } from "./customers";
import { BankAccount } from "./venues";

export const BOOKING_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_CHECK",
  "CONFIRMED",
  "EXPIRED",
  "CANCELLED",
] as const;
/** Bookings in these states hold their slots; nobody else can book the same time. */
export const HOLDING_STATUSES = ["AWAITING_PAYMENT", "AWAITING_CHECK", "CONFIRMED"] as const;
export const BOOKING_SOURCES = ["ONLINE", "WALK_IN"] as const;
export const WALK_IN_PAYMENTS = ["CASH", "PAY_LATER"] as const;

/** D-06: customers can book up to this many days ahead of the venue's today. */
export const BOOKING_HORIZON_DAYS = 30;
/** A whole day of the shortest slots; opening hours limit a booking long before this. */
export const MAX_SLOTS_PER_BOOKING = 96;
export const MAX_CANCEL_REASON_LENGTH = 200;

export const Booking = z
  .object({
    id: Id,
    venueId: Id,
    resourceId: Id,
    customerId: Id,
    customerName: z.string(),
    customerPhone: PhoneNumber,
    /** BKG-09: the Repeat Series this booking belongs to, if any. */
    repeatSeriesId: Id.nullable(),
    startsAt: Timestamp,
    endsAt: Timestamp,
    status: z.enum(BOOKING_STATUSES),
    source: z.enum(BOOKING_SOURCES),
    price: Money,
    /** What to pay online now: the full price or the Advance. Zero at a Pay at Venue venue. */
    amountDue: Money,
    /** The accepted payments added up, less refunds. */
    paid: Money,
    /** What is still to pay: the price less what was paid. Zero once cancelled or expired. */
    balance: Money,
    /** When the booking expires if no Transfer Receipt arrives. Missing when nothing is due online. */
    expiresAt: Timestamp.nullable(),
    cancellationCutOffHours: z.number().int(),
    /** Why it was cancelled. Staff always give one (BKG-07); customers may. */
    cancelReason: z.string().nullable(),
    /** PAY-01: where to send the money, while the booking waits for payment. */
    bankAccount: BankAccount.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Booking" });

/** BKG-04: who staff book for, and whether they paid the full price in cash at the desk. */
export const WalkIn = z
  .object({
    customerName: CustomerName,
    customerPhone: PhoneInput,
    payment: z.enum(WALK_IN_PAYMENTS),
  })
  .meta({ id: "WalkIn" });

/**
 * BKG-02: one or more back-to-back slots from `startsAt`. The server works out the rest.
 * Staff always send `walkIn` (BKG-04); customers and the Assistant never do.
 */
export const CreateBooking = z
  .object({
    resourceId: Id,
    startsAt: Timestamp,
    slots: z.number().int().min(1).max(MAX_SLOTS_PER_BOOKING).default(1),
    walkIn: WalkIn.optional(),
  })
  .meta({ id: "CreateBooking" });

/** BKG-06, BKG-07: for now a booking only changes by cancelling. Staff must give a reason. */
export const UpdateBooking = z
  .object({
    status: z.enum(BOOKING_STATUSES),
    cancelReason: z.string().trim().min(1).max(MAX_CANCEL_REASON_LENGTH).optional(),
  })
  .meta({ id: "UpdateBooking" });

export const BookingFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  resourceId: z.coerce.number().pipe(Id).optional(),
  customerId: z.coerce.number().pipe(Id).optional(),
  repeatSeriesId: z.coerce.number().pipe(Id).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  /** Only bookings that end after this instant. */
  from: Timestamp.optional(),
  /** Only bookings that start before this instant. */
  to: Timestamp.optional(),
});

export const BOOKING_SORT_FIELDS = ["startsAt", "createdAt"] as const;

/** One start time of a resource, with the price of one slot from there. */
export const Slot = z
  .object({
    startsAt: Timestamp,
    endsAt: Timestamp,
    price: Money,
    free: z.boolean(),
  })
  .meta({ id: "Slot" });

export const AvailabilityFilters = z.object({
  resourceId: z.coerce.number().pipe(Id),
  /** The venue's local date. */
  date: LocalDate,
  /** BKG-04: price and check this many back-to-back slots from each start. One if missing. */
  slots: z.coerce.number().pipe(z.number().int().min(1).max(MAX_SLOTS_PER_BOOKING)).optional(),
});

export const AVAILABILITY_SORT_FIELDS = ["startsAt"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingSource = (typeof BOOKING_SOURCES)[number];
export type WalkInPayment = (typeof WALK_IN_PAYMENTS)[number];
export type WalkIn = z.output<typeof WalkIn>;
export type Booking = z.output<typeof Booking>;
export type CreateBooking = z.output<typeof CreateBooking>;
export type UpdateBooking = z.output<typeof UpdateBooking>;
export type BookingFilters = z.output<typeof BookingFilters>;
export type Slot = z.output<typeof Slot>;
export type AvailabilityFilters = z.output<typeof AvailabilityFilters>;
