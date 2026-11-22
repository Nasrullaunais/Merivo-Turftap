import { z } from "zod";

export const STAFF_ROLES = ["OWNER", "MANAGER", "FRONT_DESK"] as const;
export const StaffRole = z.enum(STAFF_ROLES).meta({ id: "StaffRole" });
export type StaffRole = z.infer<typeof StaffRole>;
