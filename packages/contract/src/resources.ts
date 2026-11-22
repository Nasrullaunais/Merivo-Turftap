import { z } from "zod";

import { Id, Money, PriceInput, QueryBoolean, Timestamp } from "./common";

const MAX_NAME_LENGTH = 80;
const SLOT_STEP_MINUTES = 15;
const MAX_SLOT_MINUTES = 240;

export const RESOURCE_TYPES = ["FUTSAL_COURT", "TABLE_TENNIS_TABLE", "POOL_TABLE"] as const;
export const ResourceType = z.enum(RESOURCE_TYPES).meta({ id: "ResourceType" });

const SlotMinutes = z
  .number()
  .int()
  .min(SLOT_STEP_MINUTES)
  .max(MAX_SLOT_MINUTES)
  .multipleOf(SLOT_STEP_MINUTES);

export const Resource = z
  .object({
    id: Id,
    venueId: Id,
    name: z.string(),
    type: ResourceType,
    slotMinutes: z.number().int(),
    price: Money,
    active: z.boolean(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Resource" });

const resourceFields = {
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  type: ResourceType,
  slotMinutes: SlotMinutes,
  price: PriceInput,
};

export const CreateResource = z
  .object({ venueId: Id, ...resourceFields })
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
