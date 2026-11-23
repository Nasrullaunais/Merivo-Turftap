import { z } from "zod";

import { Id, LocalDate, Money, Timestamp } from "./common";

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

/** D-06: customers can book up to this many days ahead of the venue's today. */
export const BOOKING_HORIZON_DAYS = 30;

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
});

export const AVAILABILITY_SORT_FIELDS = ["startsAt"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingSource = (typeof BOOKING_SOURCES)[number];
export type Slot = z.output<typeof Slot>;
export type AvailabilityFilters = z.output<typeof AvailabilityFilters>;
