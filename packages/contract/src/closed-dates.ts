import { z } from "zod";

import { Id, LocalDate, Timestamp } from "./common";

const MAX_REASON_LENGTH = 200;

export const ClosedDate = z
  .object({
    id: Id,
    venueId: Id,
    date: LocalDate,
    reason: z.string().nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "ClosedDate" });

const closedDateFields = {
  date: LocalDate,
  reason: z.string().trim().max(MAX_REASON_LENGTH).nullable(),
};

export const CreateClosedDate = z
  .object({ venueId: Id, ...closedDateFields, reason: closedDateFields.reason.default(null) })
  .meta({ id: "CreateClosedDate" });

// A Closed Date never moves to another venue, so venueId can't be changed.
export const UpdateClosedDate = z
  .object(closedDateFields)
  .partial()
  .meta({ id: "UpdateClosedDate" });

export const ClosedDateFilters = z.object({
  venueId: z.coerce.number().pipe(Id).optional(),
  /** Only dates on or after this one. */
  from: LocalDate.optional(),
  /** Only dates on or before this one. */
  to: LocalDate.optional(),
});

export const CLOSED_DATE_SORT_FIELDS = ["date", "createdAt"] as const;

export type ClosedDate = z.output<typeof ClosedDate>;
export type CreateClosedDate = z.output<typeof CreateClosedDate>;
export type UpdateClosedDate = z.output<typeof UpdateClosedDate>;
export type ClosedDateFilters = z.output<typeof ClosedDateFilters>;
