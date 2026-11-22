import { z } from "zod";

import { Id, Timestamp } from "./common";

const MAX_REASON_LENGTH = 200;

export const BlockedTime = z
  .object({
    id: Id,
    resourceId: Id,
    startsAt: Timestamp,
    endsAt: Timestamp,
    reason: z.string().nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "BlockedTime" });

const blockedTimeFields = {
  startsAt: Timestamp,
  endsAt: Timestamp,
  reason: z.string().trim().max(MAX_REASON_LENGTH).nullable(),
};

const endsAfterStart = (block: { startsAt?: Date; endsAt?: Date }) =>
  block.startsAt === undefined || block.endsAt === undefined || block.startsAt < block.endsAt;
const END_AFTER_START = { message: "Must end after it starts", path: ["endsAt"] };

export const CreateBlockedTime = z
  .object({
    resourceId: Id,
    ...blockedTimeFields,
    reason: blockedTimeFields.reason.default(null),
  })
  .refine(endsAfterStart, END_AFTER_START)
  .meta({ id: "CreateBlockedTime" });

// A Blocked Time never moves to another resource, so resourceId can't be changed.
export const UpdateBlockedTime = z
  .object(blockedTimeFields)
  .partial()
  .refine(endsAfterStart, END_AFTER_START)
  .meta({ id: "UpdateBlockedTime" });

export const BlockedTimeFilters = z.object({
  resourceId: z.coerce.number().pipe(Id).optional(),
  /** Only Blocked Times that end after this instant. */
  from: Timestamp.optional(),
  /** Only Blocked Times that start before this instant. */
  to: Timestamp.optional(),
});

export const BLOCKED_TIME_SORT_FIELDS = ["startsAt", "createdAt"] as const;

export type BlockedTime = z.output<typeof BlockedTime>;
export type CreateBlockedTime = z.output<typeof CreateBlockedTime>;
export type UpdateBlockedTime = z.output<typeof UpdateBlockedTime>;
export type BlockedTimeFilters = z.output<typeof BlockedTimeFilters>;
