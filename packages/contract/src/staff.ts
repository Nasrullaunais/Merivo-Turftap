import { z } from "zod";

import { Id, PhoneInput, PhoneNumber, Timestamp } from "./common";

const MAX_VENUE_IDS = 100;

export const STAFF_ROLES = ["OWNER", "MANAGER", "FRONT_DESK"] as const;
export const StaffRole = z.enum(STAFF_ROLES).meta({ id: "StaffRole" });
export type StaffRole = z.infer<typeof StaffRole>;

/** One person's place at a tenant: who they are, their role and the venues they work at. */
export const Staff = z
  .object({
    id: Id,
    phone: PhoneNumber,
    name: z.string().nullable(),
    role: StaffRole,
    /** Owners always have every venue. Otherwise, false means only the venues in `venueIds`. */
    allVenues: z.boolean(),
    venueIds: z.array(Id),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Staff" });

const VenueIds = z.array(Id).max(MAX_VENUE_IDS);

export const CreateStaff = z
  .object({
    phone: PhoneInput,
    role: StaffRole,
    allVenues: z.boolean().default(true),
    venueIds: VenueIds.default([]),
  })
  .meta({ id: "CreateStaff" });

export const UpdateStaff = z
  .object({ role: StaffRole, allVenues: z.boolean(), venueIds: VenueIds })
  .partial()
  .meta({ id: "UpdateStaff" });

export const StaffFilters = z.object({});

export const STAFF_SORT_FIELDS = ["createdAt"] as const;

export type Staff = z.output<typeof Staff>;
export type CreateStaff = z.output<typeof CreateStaff>;
export type UpdateStaff = z.output<typeof UpdateStaff>;
export type StaffFilters = z.output<typeof StaffFilters>;
