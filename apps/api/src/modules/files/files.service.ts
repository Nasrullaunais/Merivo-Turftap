import { createHash } from "node:crypto";

import type { FilePurpose, UploadFile } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { ports } from "../../ports";
import { fileErrors } from "./files.errors";
import { removeStoredFileJob } from "./files.jobs";
import * as filesRepository from "./files.repository";

const FOLDERS: Record<FilePurpose, string> = { PHOTO: "photos", RECEIPT: "receipts" };

const LINK_WINDOW_SECONDS = 60 * 60;
const RECEIPT_LINK_SECONDS = 15 * 60;

const JPG = { contentType: "image/jpeg", extension: "jpg", startsWith: [0xff, 0xd8, 0xff] };
const PNG = {
  contentType: "image/png",
  extension: "png",
  startsWith: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};
/** "%PDF-" */
const PDF = {
  contentType: "application/pdf",
  extension: "pdf",
  startsWith: [0x25, 0x50, 0x44, 0x46, 0x2d],
};

/** Types are judged by the first bytes; the name and type the browser sends can't be trusted. */
const ALLOWED: Record<FilePurpose, { types: (typeof JPG)[]; message: string }> = {
  PHOTO: { types: [JPG, PNG], message: "Must be a JPG or PNG" },
  RECEIPT: { types: [JPG, PNG, PDF], message: "Must be a JPG, PNG or PDF" },
};

const isCustomerSide = (auth: AuthContext) =>
  auth.actor === "customer" || auth.actor === "assistant";

/** Customers and the Assistant may only send receipts, and only once the customer has a record. */
function uploaderOf(auth: AuthContext, purpose: FilePurpose) {
  if (!isCustomerSide(auth)) return { customerId: null, createdBy: auth.userId ?? null };
  if (purpose !== "RECEIPT") throw fileErrors.receiptsOnly();
  if (auth.customerId === undefined) throw httpErrors.notAllowed();
  return { customerId: auth.customerId, createdBy: null };
}

const sha256Of = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");

export async function create(auth: AuthContext, { file, purpose }: UploadFile) {
  const uploader = uploaderOf(auth, purpose);
  const body = new Uint8Array(await file.arrayBuffer());
  const { types, message } = ALLOWED[purpose];
  const type = types.find(({ startsWith }) => startsWith.every((byte, i) => body[i] === byte));
  if (!type) throw httpErrors.invalidRequest([{ field: "file", message }]);
  const key = `${auth.tenantId}/${FOLDERS[purpose]}/${crypto.randomUUID()}.${type.extension}`;
  await ports().storage.save(key, { body, contentType: type.contentType });
  return filesRepository.insert(auth.tenantId, {
    purpose,
    key,
    contentType: type.contentType,
    sizeBytes: body.byteLength,
    sha256: purpose === "RECEIPT" ? sha256Of(body) : null,
    ...uploader,
  });
}

/** A file uploaded for this purpose; one uploaded for another purpose is not found. */
export async function get(auth: AuthContext, id: number, purpose: FilePurpose) {
  const file = await filesRepository.findById(auth.tenantId, id, purpose);
  if (!file) throw fileErrors.notFound(id);
  return file;
}

/** PAY-02: a receipt only its uploader may attach, so nobody can open someone else's by its id. */
export async function receipt(auth: AuthContext, id: number) {
  const file = await filesRepository.findById(auth.tenantId, id, "RECEIPT");
  const uploader = uploaderOf(auth, "RECEIPT");
  const sameUploader =
    file?.customerId === uploader.customerId && file?.createdBy === uploader.createdBy;
  if (!file || !sameUploader) throw fileErrors.notFound(id);
  return file;
}

/** PAY-03: a receipt's bytes, for the AI to read; `undefined` if storage no longer has them. */
export async function receiptContent(auth: AuthContext, id: number) {
  const file = await get(auth, id, "RECEIPT");
  return ports().storage.read(file.key);
}

/** PAY-06: the tenant's other receipt files with exactly the same bytes (D-13). */
export async function sameReceiptImages(auth: AuthContext, id: number) {
  const file = await get(auth, id, "RECEIPT");
  if (file.sha256 === null) return [];
  return filesRepository.idsWithSha256(auth.tenantId, file.sha256, id);
}

/** Receipt links work for a short while only; whoever may see the payment gets a fresh one. */
export async function receiptUrls(auth: AuthContext, ids: number[]) {
  const files = await filesRepository.findByIds(auth.tenantId, ids);
  const timing = { signedAt: new Date(), expiresInSeconds: RECEIPT_LINK_SECONDS };
  const urls = await Promise.all(
    files.map(
      async (file) => [file.id, await ports().storage.downloadUrl(file.key, timing)] as const,
    ),
  );
  return new Map(urls);
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
