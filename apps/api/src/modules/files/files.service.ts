import type { FilePurpose, UploadFile } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { ports } from "../../ports";
import { fileErrors } from "./files.errors";
import { removeStoredFileJob } from "./files.jobs";
import * as filesRepository from "./files.repository";

const FOLDERS: Record<FilePurpose, string> = { PHOTO: "photos" };

const LINK_WINDOW_SECONDS = 60 * 60;

/** Which kind of image the bytes really are; the name and type the browser sends can't be trusted. */
const IMAGE_SIGNATURES = [
  { contentType: "image/jpeg", extension: "jpg", startsWith: [0xff, 0xd8, 0xff] },
  {
    contentType: "image/png",
    extension: "png",
    startsWith: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
];

const imageTypeOf = (bytes: Uint8Array) =>
  IMAGE_SIGNATURES.find(({ startsWith }) => startsWith.every((byte, i) => bytes[i] === byte));

export async function create(auth: AuthContext, { file, purpose }: UploadFile) {
  const body = new Uint8Array(await file.arrayBuffer());
  const type = imageTypeOf(body);
  if (!type) throw httpErrors.invalidRequest([{ field: "file", message: "Must be a JPG or PNG" }]);
  const key = `${auth.tenantId}/${FOLDERS[purpose]}/${crypto.randomUUID()}.${type.extension}`;
  await ports().storage.save(key, { body, contentType: type.contentType });
  return filesRepository.insert(auth.tenantId, {
    purpose,
    key,
    contentType: type.contentType,
    sizeBytes: body.byteLength,
  });
}

/** A file uploaded for this purpose; one uploaded for another purpose is not found. */
export async function get(auth: AuthContext, id: number, purpose: FilePurpose) {
  const file = await filesRepository.findById(auth.tenantId, id, purpose);
  if (!file) throw fileErrors.notFound(id);
  return file;
}

/**
 * Download links by file id. Links signed in the same hour are identical, so a browser
 * reuses the image it already has; each still works for at least an hour.
 */
export async function downloadUrls(auth: AuthContext, ids: number[]) {
  const files = await filesRepository.findByIds(auth.tenantId, ids);
  const windowMs = LINK_WINDOW_SECONDS * 1000;
  const signedAt = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const timing = { signedAt, expiresInSeconds: 2 * LINK_WINDOW_SECONDS };
  const urls = await Promise.all(
    files.map(
      async (file) => [file.id, await ports().storage.downloadUrl(file.key, timing)] as const,
    ),
  );
  return new Map(urls);
}

/** Deletes the file's row now and the stored bytes soon after, once the change is saved. */
export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    const file = await filesRepository.remove(auth.tenantId, id);
    if (!file) throw fileErrors.notFound(id);
    await removeStoredFileJob.queue({ key: file.key });
  });
}
