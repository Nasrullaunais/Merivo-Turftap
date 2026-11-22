import type { CreatePhoto, PhotoFilters, UpdatePhoto } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import * as filesService from "../files/files.service";
import * as photosRepository from "./photos.repository";
import type { PhotoOwner } from "./photos.repository";
import type { PhotoRow } from "./venues.tables";
import * as resourcesService from "./resources.service";
import { venueErrors } from "./venues.errors";
import * as venuesService from "./venues.service";

type PhotoSort = "position" | "createdAt";

const ownerOf = (photo: PhotoRow): PhotoOwner =>
  photo.venueId === null ? { resourceId: photo.resourceId! } : { venueId: photo.venueId };

async function withUrls(auth: AuthContext, rows: PhotoRow[]) {
  const urls = await filesService.downloadUrls(
    auth,
    rows.map((row) => row.fileId),
  );
  return rows.map((row) => ({ ...row, url: urls.get(row.fileId)! }));
}

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<PhotoFilters, PhotoSort>,
) {
  const result = await photosRepository.list(auth.tenantId, auth.venueIds, filters, page);
  return { ...result, content: await withUrls(auth, result.content) };
}

export async function get(auth: AuthContext, id: number) {
  const photo = await photosRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!photo) throw venueErrors.photoNotFound(id);
  const [withUrl] = await withUrls(auth, [photo]);
  return withUrl!;
}

export function create(auth: AuthContext, { fileId, venueId, resourceId }: CreatePhoto) {
  return transaction(async () => {
    if (venueId !== undefined) await venuesService.get(auth, venueId);
    if (resourceId !== undefined) await resourcesService.get(auth, resourceId);
    await filesService.get(auth, fileId, "PHOTO");
    const owner = venueId !== undefined ? { venueId } : { resourceId: resourceId! };
    const photo = await photosRepository.insert(auth.tenantId, owner, fileId);
    return get(auth, photo.id);
  });
}

/** VEN-06: moves the photo to the position asked for; the owner's other photos shift along. */
export function update(auth: AuthContext, id: number, { position }: UpdatePhoto) {
  if (position === undefined) return get(auth, id);
  return transaction(async () => {
    const photo = await get(auth, id);
    const others = (await photosRepository.idsInOrder(auth.tenantId, ownerOf(photo))).filter(
      (otherId) => otherId !== id,
    );
    others.splice(position - 1, 0, id);
    await photosRepository.setOrder(auth.tenantId, others);
    return get(auth, id);
  });
}

/** Deletes the photo and its file, and closes the gap it leaves. */
export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    const photo = await photosRepository.remove(auth.tenantId, id, auth.venueIds);
    if (!photo) throw venueErrors.photoNotFound(id);
    const rest = await photosRepository.idsInOrder(auth.tenantId, ownerOf(photo));
    await photosRepository.setOrder(auth.tenantId, rest);
    await filesService.remove(auth, photo.fileId);
  });
}
