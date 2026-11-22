import { z } from "zod";

import { Id, Timestamp } from "./common";

/** A photo belongs to a venue or to one of its resources, never both. */
export const Photo = z
  .object({
    id: Id,
    venueId: Id.nullable(),
    resourceId: Id.nullable(),
    /** 1 is the cover photo. */
    position: z.number().int().positive(),
    /** A short-lived link to the image. */
    url: z.url(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Photo" });

const oneOwner = (photo: { venueId?: number; resourceId?: number }) =>
  (photo.venueId === undefined) !== (photo.resourceId === undefined);

export const CreatePhoto = z
  .object({ fileId: Id, venueId: Id.optional(), resourceId: Id.optional() })
  .refine(oneOwner, { message: "Give either venueId or resourceId", path: ["venueId"] })
  .meta({ id: "CreatePhoto" });

/** Moving a photo to a position shifts the others along; a position past the end moves it last. */
export const UpdatePhoto = z
  .object({ position: z.number().int().positive() })
  .partial()
  .meta({ id: "UpdatePhoto" });

export const PhotoFilters = z.object({
  /** Only the venue's own photos, not its resources'. */
  venueId: z.coerce.number().pipe(Id).optional(),
  resourceId: z.coerce.number().pipe(Id).optional(),
});

export const PHOTO_SORT_FIELDS = ["position", "createdAt"] as const;

export type Photo = z.output<typeof Photo>;
export type CreatePhoto = z.output<typeof CreatePhoto>;
export type UpdatePhoto = z.output<typeof UpdatePhoto>;
export type PhotoFilters = z.output<typeof PhotoFilters>;
