import { and, asc, eq, inArray, or, type SQL, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import { photos, resources } from "./venues.tables";

const SORTABLE = { position: photos.position, createdAt: photos.createdAt };

/** Whose photos these are: a venue's own, or one resource's. */
export type PhotoOwner = { venueId: number } | { resourceId: number };

/** Photos of these venues and their resources. No list means the caller may use every venue. */
const inVenues = (venueIds: number[] | undefined) =>
  venueIds &&
  or(
    inArray(photos.venueId, venueIds),
    inArray(
      photos.resourceId,
      db().select({ id: resources.id }).from(resources).where(inArray(resources.venueId, venueIds)),
    ),
  );

const ownedBy = (tenantId: number, id: number, venueIds: number[] | undefined) =>
  and(eq(photos.tenantId, tenantId), eq(photos.id, id), inVenues(venueIds));

const ofOwner = (owner: PhotoOwner) =>
  "venueId" in owner ? eq(photos.venueId, owner.venueId) : eq(photos.resourceId, owner.resourceId);

export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [photo] = await db()
    .select()
    .from(photos)
    .where(ownedBy(tenantId, id, venueIds));
  return photo;
}

export function list(
  tenantId: number,
  venueIds: number[] | undefined,
  filters: { venueId?: number; resourceId?: number },
  page: PageRequest<keyof typeof SORTABLE>,
) {
  const conditions: (SQL | undefined)[] = [eq(photos.tenantId, tenantId), inVenues(venueIds)];
  if (filters.venueId !== undefined) conditions.push(eq(photos.venueId, filters.venueId));
  if (filters.resourceId !== undefined) conditions.push(eq(photos.resourceId, filters.resourceId));
  const where = and(...conditions);
  return pageOf(
    page,
    db()
      .select()
      .from(photos)
      .where(where)
      .orderBy(...sortBy(page, SORTABLE, photos.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(photos, where),
  );
}

/** Adds the photo after the owner's other photos. */
export async function insert(tenantId: number, owner: PhotoOwner, fileId: number) {
  const nextPosition = sql<number>`(
    select coalesce(max(${photos.position}), 0) + 1 from ${photos}
    where ${and(eq(photos.tenantId, tenantId), ofOwner(owner))}
  )`;
  const [photo] = await db()
    .insert(photos)
    .values({ tenantId, ...owner, fileId, position: nextPosition })
    .returning();
  return photo!;
}

/** The ids of the owner's photos in display order. */
export async function idsInOrder(tenantId: number, owner: PhotoOwner) {
  const rows = await db()
    .select({ id: photos.id })
    .from(photos)
    .where(and(eq(photos.tenantId, tenantId), ofOwner(owner)))
    .orderBy(asc(photos.position), asc(photos.id));
  return rows.map((row) => row.id);
}

/** Numbers the photos 1, 2, 3… in the order given. */
export async function setOrder(tenantId: number, ids: number[]) {
  for (const [index, id] of ids.entries()) {
    await db()
      .update(photos)
      .set({ position: index + 1 })
      .where(and(eq(photos.tenantId, tenantId), eq(photos.id, id)));
  }
}

export async function remove(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [photo] = await db()
    .delete(photos)
    .where(ownedBy(tenantId, id, venueIds))
    .returning();
  return photo;
}
