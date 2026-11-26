import type { ResourceType } from "@turftap/contract";
import type { Resource } from "@turftap/contract/client";

/** Longer bookings are rare; Staff make them in the Staff Console. */
const LONGEST_ONLINE_MINUTES: Record<ResourceType, number> = {
  FUTSAL_COURT: 180,
  TABLE_TENNIS_TABLE: 120,
  POOL_TABLE: 120,
};

/** The most back-to-back slots a customer can book online, and never less than one. */
export const longestCount = (resource: Resource) =>
  Math.max(1, Math.floor(LONGEST_ONLINE_MINUTES[resource.type] / resource.slotMinutes));

export const longestMinutes = (resource: Resource) => longestCount(resource) * resource.slotMinutes;
