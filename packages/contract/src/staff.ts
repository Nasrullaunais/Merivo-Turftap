import { z } from "zod";

import { Id, PhoneInput, PhoneNumber, Timestamp } from "./common";

export const STAFF_ROLES = ["OWNER", "MANAGER", "FRONT_DESK"] as const;
export const StaffRole = z.enum(STAFF_ROLES).meta({ id: "StaffRole" });
export type StaffRole = z.infer<typeof StaffRole>;

/** One person's place at a tenant: who they are and what role they have. */
export const Staff = z
  .object({
    id: Id,
    phone: PhoneNumber,
    name: z.string().nullable(),
    role: StaffRole,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Staff" });

export const CreateStaff = z
  .object({ phone: PhoneInput, role: StaffRole })
  .meta({ id: "CreateStaff" });

export const StaffFilters = z.object({});

export const STAFF_SORT_FIELDS = ["createdAt"] as const;

export type Staff = z.output<typeof Staff>;
export type CreateStaff = z.output<typeof CreateStaff>;
export type StaffFilters = z.output<typeof StaffFilters>;
