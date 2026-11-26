import type { ResourceType } from "@turftap/contract";
import { CircleDot, Goal, type LucideIcon, Table2 } from "lucide-react";

/** Each resource type's icon, on the place hue, as in the console. */
export const TYPE_ICONS: Record<ResourceType, LucideIcon> = {
  FUTSAL_COURT: Goal,
  TABLE_TENNIS_TABLE: Table2,
  POOL_TABLE: CircleDot,
};
