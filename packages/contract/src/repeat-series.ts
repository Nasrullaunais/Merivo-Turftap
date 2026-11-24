import { z } from "zod";

import { MAX_CANCEL_REASON_LENGTH, MAX_SLOTS_PER_BOOKING } from "./bookings";
import { Id, LocalDate, LocalTime, PhoneInput, PhoneNumber, Timestamp } from "./common";
import { CustomerName } from "./customers";

export const REPEAT_SERIES_STATUSES = ["ACTIVE", "CANCELLED"] as const;

export const MIN_SERIES_WEEKS = 2;
/** A year of weekly bookings, all created up front. */
export const MAX_SERIES_WEEKS = 52;

/** BKG-09: the same resource and time every week, booked up front by staff. */
export const RepeatSeries = z
  .object({
    id: Id,
    venueId: Id,
    resourceId: Id,
    customerId: Id,
    customerName: z.string(),
    customerPhone: PhoneNumber,
    /** The venue's date of the first week. Every booking falls on the same weekday. */
    firstDate: LocalDate,
    startTime: LocalTime,
    slots: z.number().int(),
    weeks: z.number().int(),
    status: z.enum(REPEAT_SERIES_STATUSES),
    cancelReason: z.string().nullable(),
    /** Copied from the venue when created: how many days before each booking its Advance is asked for. */
    seriesPaymentDaysBefore: z.number().int(),
    /** Copied from the venue when created: the Advance, as a percentage of each booking's price. */
    advancePercent: z.number().int(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "RepeatSeries" });

/**
 * BKG-09: `startsAt` is the first week's booking. Weeks that aren't free are refused with
 * 409 and `clashingDates` (D-10); send them back in `skipDates` to book the rest.
 */
export const CreateRepeatSeries = z
  .object({
    resourceId: Id,
    startsAt: Timestamp,
    slots: z.number().int().min(1).max(MAX_SLOTS_PER_BOOKING).default(1),
    weeks: z.number().int().min(MIN_SERIES_WEEKS).max(MAX_SERIES_WEEKS),
    customerName: CustomerName,
    customerPhone: PhoneInput,
    /** The venue's dates of weeks to leave out. */
    skipDates: z.array(LocalDate).max(MAX_SERIES_WEEKS).default([]),
  })
  .meta({ id: "CreateRepeatSeries" });

/** BKG-09: a series only changes by cancelling the rest of it, with a reason. */
export const UpdateRepeatSeries = z
  .object({
    status: z.enum(REPEAT_SERIES_STATUSES),
    cancelReason: z.string().trim().min(1).max(MAX_CANCEL_REASON_LENGTH).optional(),
  })
  .meta({ id: "UpdateRepeatSeries" });

export const RepeatSeriesFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  resourceId: z.coerce.number().pipe(Id).optional(),
  customerId: z.coerce.number().pipe(Id).optional(),
  status: z.enum(REPEAT_SERIES_STATUSES).optional(),
});

export const REPEAT_SERIES_SORT_FIELDS = ["firstDate", "createdAt"] as const;

export type RepeatSeriesStatus = (typeof REPEAT_SERIES_STATUSES)[number];
export type RepeatSeries = z.output<typeof RepeatSeries>;
export type CreateRepeatSeries = z.output<typeof CreateRepeatSeries>;
export type UpdateRepeatSeries = z.output<typeof UpdateRepeatSeries>;
export type RepeatSeriesFilters = z.output<typeof RepeatSeriesFilters>;
