import type { StaffRole } from "@turftap/contract";
import { BriefcaseBusiness, ConciergeBell, Crown, type LucideIcon } from "lucide-react";

/** Each role's icon, on the people hue. */
export const ROLE_ICONS: Record<StaffRole, LucideIcon> = {
  OWNER: Crown,
  MANAGER: BriefcaseBusiness,
  FRONT_DESK: ConciergeBell,
};
