import { z } from "zod";

import { Id, Timestamp } from "./common";

const BYTES_PER_MB = 1024 * 1024;
export const MAX_UPLOAD_MB = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * BYTES_PER_MB;

/** What an upload is for. Each purpose is kept in its own folder in storage. */
export const FILE_PURPOSES = ["PHOTO"] as const;
export const FilePurpose = z.enum(FILE_PURPOSES).meta({ id: "FilePurpose" });

export const UploadedFile = z
  .object({
    id: Id,
    purpose: FilePurpose,
    contentType: z.string(),
    sizeBytes: z.number().int(),
    createdAt: Timestamp,
  })
  .meta({ id: "UploadedFile" });

export const UploadFile = z
  .object({
    file: z.file().max(MAX_UPLOAD_BYTES, `Must be ${MAX_UPLOAD_MB} MB or smaller`),
    purpose: FilePurpose,
  })
  .meta({ id: "UploadFile" });

export type FilePurpose = z.output<typeof FilePurpose>;
export type UploadedFile = z.output<typeof UploadedFile>;
export type UploadFile = z.output<typeof UploadFile>;
