import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { z } from "zod";

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PHONE_COUNTRY = "LK";

export const Id = z.number().int().positive();

/** An instant in time. JSON carries an ISO string ending in `Z`; code works with `Date`. */
export const Timestamp = z.codec(z.iso.datetime(), z.date(), {
  decode: (text) => new Date(text),
  encode: (date) => date.toISOString(),
});

/** A wall-clock time in the venue's time zone, such as "18:30". "24:00" means midnight at day end. */
export const LocalTime = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, "Must be HH:MM");

const MINUTES_PER_HOUR = 60;
/** "18:30" → 1110, the minutes since the start of the day. */
export const minuteOfDay = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours! * MINUTES_PER_HOUR + minutes!;
};
/** 1110 → "18:30". */
export const localTimeAt = (minute: number) =>
  [Math.floor(minute / MINUTES_PER_HOUR), minute % MINUTES_PER_HOUR]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

/** A calendar date in the venue's time zone, such as "2026-12-25". */
export const LocalDate = z.iso.date();

export const Currency = z.enum(["LKR"]);
export const CENTS_PER_RUPEE = 100;

/** Money is a whole number of cents: `{ amount: 250000, currency: "LKR" }` is LKR 2,500. */
export const Money = z
  .object({ amount: z.number().int(), currency: Currency })
  .meta({ id: "Money" });

/** A price staff set, such as a resource's price per slot: above zero and in whole rupees. */
export const PriceInput = Money.extend({
  amount: z.number().int().positive().multipleOf(CENTS_PER_RUPEE, "Must be whole rupees"),
}).meta({ id: "PriceInput" });

/** A phone number as stored: `+94771234567`. */
export const PhoneNumber = z.string().regex(/^\+[1-9]\d{6,14}$/, "Must look like +94771234567");

/** A phone number as typed by a person: accepts "077 123 4567" and stores "+94771234567". */
export const PhoneInput = z.string().transform((text, ctx) => {
  const phone = parsePhoneNumberFromString(text, DEFAULT_PHONE_COUNTRY);
  if (phone?.isValid()) return phone.number;
  ctx.addIssue({ code: "custom", message: "Not a valid phone number" });
  return z.NEVER;
});

/** A yes/no list filter. Query strings only carry text, so it travels as "true" or "false". */
export const QueryBoolean = z.enum(["true", "false"]).transform((text) => text === "true");

export type Currency = z.output<typeof Currency>;
export type Money = z.output<typeof Money>;

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export const FieldError = z
  .object({ field: z.string(), message: z.string() })
  .meta({ id: "FieldError" });

export const ErrorReply = z
  .object({
    status: z.number().int(),
    code: z.string().meta({ description: "Stable error code, such as tt_ven_001" }),
    message: z.string(),
    traceId: z.string(),
    errors: z.array(FieldError).optional(),
  })
  .meta({ id: "ErrorReply" });
export type ErrorReply = z.infer<typeof ErrorReply>;
export type FieldError = z.infer<typeof FieldError>;
