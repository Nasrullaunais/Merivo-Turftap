import { z } from "zod";

import { Id, Money, PriceInput, QueryBoolean, Timestamp } from "./common";

const MAX_NAME_LENGTH = 80;
/** The allowed slot lengths, and the allowed Start Intervals. */
export const RESOURCE_MINUTES = [15, 30, 60] as const;
export const DEFAULT_START_INTERVAL_MINUTES = 30;
export const INTERVAL_LONGER_THAN_SLOT = "Must not be longer than the slot length";

export const RESOURCE_TYPES = ["FUTSAL_COURT", "TABLE_TENNIS_TABLE", "POOL_TABLE"] as const;
export const ResourceType = z.enum(RESOURCE_TYPES).meta({ id: "ResourceType" });

const ResourceMinutes = z.literal(RESOURCE_MINUTES);

export const Resource = z
  .object({
    id: Id,
    venueId: Id,
    name: z.string(),
    type: ResourceType,
    slotMinutes: z.number().int(),
    startIntervalMinutes: z.number().int(),
    price: Money,
    active: z.boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Resource" });

const resourceFields = {
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  type: ResourceType,
  slotMinutes: ResourceMinutes,
  startIntervalMinutes: ResourceMinutes,
  price: PriceInput,
};

export const CreateResource = z
  .object({
    venueId: Id,
    ...resourceFields,
    startIntervalMinutes: resourceFields.startIntervalMinutes.default(
      DEFAULT_START_INTERVAL_MINUTES,
    ),
  })
  .refine((resource) => resource.startIntervalMinutes <= resource.slotMinutes, {
    message: INTERVAL_LONGER_THAN_SLOT,
    path: ["startIntervalMinutes"],
  })
  .meta({ id: "CreateResource" });

// A resource never moves to another venue, so venueId can't be changed.
export const UpdateResource = z.object(resourceFields).partial().meta({ id: "UpdateResource" });

export const ResourceFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  active: QueryBoolean.optional(),
});

export const RESOURCE_SORT_FIELDS = ["name", "createdAt"] as const;

export type ResourceType = z.output<typeof ResourceType>;
export type Resource = z.output<typeof Resource>;
export type CreateResource = z.output<typeof CreateResource>;
export type UpdateResource = z.output<typeof UpdateResource>;
export type ResourceFilters = z.output<typeof ResourceFilters>;
