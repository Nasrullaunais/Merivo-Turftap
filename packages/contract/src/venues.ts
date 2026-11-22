import { z } from "zod";

import { Id, LocalTime, PhoneInput, PhoneNumber, QueryBoolean, Timestamp } from "./common";

const MAX_NAME_LENGTH = 80;
const MAX_TEXT_LENGTH = 500;

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

export const Venue = z
  .object({
    id: Id,
    name: z.string(),
    description: z.string().nullable(),
    address: z.string(),
    phone: PhoneNumber,
    timeZone: z.string(),
    openingHours: z.array(OpeningHours),
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
};

export const CreateVenue = z
  .object({ ...venueFields, description: venueFields.description.default(null) })
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
