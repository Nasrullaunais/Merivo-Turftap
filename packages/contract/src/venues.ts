import { z } from "zod";

import { Id, LocalTime, PhoneInput, PhoneNumber, QueryBoolean, Timestamp } from "./common";

const MAX_NAME_LENGTH = 80;
const MAX_TEXT_LENGTH = 500;
const MIN_PAYMENT_TIME_LIMIT_MINUTES = 10;
const MAX_PAYMENT_TIME_LIMIT_MINUTES = 24 * 60;
const MAX_CANCELLATION_CUT_OFF_HOURS = 7 * 24;

export const FULL_AMOUNT_PERCENT = 100;
export const DEFAULT_PAYMENT_TIME_LIMIT_MINUTES = 30;
export const DEFAULT_CANCELLATION_CUT_OFF_HOURS = 6;

/** Monday is 1 and Sunday is 7 (ISO weekdays). */
export const Weekday = z.number().int().min(1).max(7);

export const OpeningHours = z
  .object({ weekday: Weekday, opens: LocalTime, closes: LocalTime })
  .refine((day) => day.opens < day.closes, {
    message: "Must close after it opens",
    path: ["closes"],
  })
  .meta({ id: "OpeningHours", description: "A weekday that is not listed is closed." });

const WeekOfOpeningHours = z
  .array(OpeningHours)
  .max(7)
  .refine((days) => new Set(days.map((day) => day.weekday)).size === days.length, {
    message: "Each weekday may appear once",
  });

/** Where customers send a bank transfer (VEN-03). */
export const BankAccount = z
  .object({
    bankName: z.string(),
    branch: z.string().nullable(),
    accountName: z.string(),
    accountNumber: z.string(),
  })
  .meta({ id: "BankAccount" });

export const BankAccountInput = z
  .object({
    bankName: z.string().trim().min(1).max(MAX_NAME_LENGTH),
    branch: z.string().trim().max(MAX_NAME_LENGTH).nullable().default(null),
    accountName: z.string().trim().min(1).max(MAX_NAME_LENGTH),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d[\d -]{3,29}$/, "Use digits, with spaces or dashes if you like"),
  })
  .meta({ id: "BankAccountInput" });

export const Venue = z
  .object({
    id: Id,
    name: z.string(),
    description: z.string().nullable(),
    address: z.string(),
    phone: PhoneNumber,
    timeZone: z.string(),
    openingHours: z.array(OpeningHours),
    bankAccount: BankAccount.nullable(),
    /** The Advance asked for when booking online; 100 means the full amount. */
    advancePercent: z.number().int(),
    paymentTimeLimitMinutes: z.number().int(),
    cancellationCutOffHours: z.number().int(),
    active: z.boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Venue" });

const venueFields = {
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  description: z.string().trim().max(MAX_TEXT_LENGTH).nullable(),
  address: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  phone: PhoneInput,
  openingHours: WeekOfOpeningHours,
  bankAccount: BankAccountInput.nullable(),
  advancePercent: z.number().int().min(1).max(FULL_AMOUNT_PERCENT),
  paymentTimeLimitMinutes: z
    .number()
    .int()
    .min(MIN_PAYMENT_TIME_LIMIT_MINUTES)
    .max(MAX_PAYMENT_TIME_LIMIT_MINUTES),
  cancellationCutOffHours: z.number().int().min(0).max(MAX_CANCELLATION_CUT_OFF_HOURS),
};

export const CreateVenue = z
  .object({
    ...venueFields,
    description: venueFields.description.default(null),
    bankAccount: venueFields.bankAccount.default(null),
    advancePercent: venueFields.advancePercent.default(FULL_AMOUNT_PERCENT),
    paymentTimeLimitMinutes: venueFields.paymentTimeLimitMinutes.default(
      DEFAULT_PAYMENT_TIME_LIMIT_MINUTES,
    ),
    cancellationCutOffHours: venueFields.cancellationCutOffHours.default(
      DEFAULT_CANCELLATION_CUT_OFF_HOURS,
    ),
  })
  .meta({ id: "CreateVenue" });

// Built from the plain fields, so a field left out of a PATCH never picks up a create default.
export const UpdateVenue = z.object(venueFields).partial().meta({ id: "UpdateVenue" });

export const VenueFilters = z.object({
  active: QueryBoolean.optional(),
});

export const VENUE_SORT_FIELDS = ["name", "createdAt"] as const;

export type Venue = z.output<typeof Venue>;
export type CreateVenue = z.output<typeof CreateVenue>;
export type UpdateVenue = z.output<typeof UpdateVenue>;
export type VenueFilters = z.output<typeof VenueFilters>;
export type OpeningHours = z.output<typeof OpeningHours>;
export type BankAccount = z.output<typeof BankAccount>;
