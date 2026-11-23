import type { BlockedTimeFilters, CreateBlockedTime, UpdateBlockedTime } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import * as blockedTimesRepository from "./blocked-times.repository";
import * as resourcesService from "./resources.service";
import { venueErrors } from "./venues.errors";
import * as venuesService from "./venues.service";

type BlockedTimeSort = "startsAt" | "createdAt";
type Window = { startsAt: Date; endsAt: Date };

/** VEN-07: a block must still be ahead and may not overlap another block on the same resource. */
async function checkWindow(
  auth: AuthContext,
  resourceId: number,
  window: Window,
  exceptId?: number,
) {
  if (window.endsAt <= new Date())
    throw httpErrors.invalidRequest([{ field: "endsAt", message: "Must end in the future" }]);
  const clashing = await blockedTimesRepository.findOverlap(
    auth.tenantId,
    resourceId,
    window,
    exceptId,
  );
  if (!clashing) return;
  const resource = await resourcesService.get(auth, resourceId);
  const venue = await venuesService.get(auth, resource.venueId);
  throw venueErrors.blockedTimeClash(clashing, venue.timeZone);
}

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<BlockedTimeFilters, BlockedTimeSort>,
) {
  return blockedTimesRepository.list(auth.tenantId, auth.venueIds, filters, page);
}

export async function get(auth: AuthContext, id: number) {
  const block = await blockedTimesRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!block) throw venueErrors.blockedTimeNotFound(id);
  return block;
}

/** The resource's Blocked Times that overlap the window. */
export async function overlapping(auth: AuthContext, resourceId: number, window: Window) {
  await resourcesService.get(auth, resourceId);
  return blockedTimesRepository.listOverlapping(auth.tenantId, resourceId, window);
}

export function create(auth: AuthContext, input: CreateBlockedTime) {
  return transaction(async () => {
    await resourcesService.get(auth, input.resourceId);
    await checkWindow(auth, input.resourceId, input);
    return blockedTimesRepository.insert(auth.tenantId, input);
  });
}

export function update(auth: AuthContext, id: number, input: UpdateBlockedTime) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    const block = await get(auth, id);
    const changed = { ...block, ...input };
    if (changed.startsAt >= changed.endsAt)
      throw httpErrors.invalidRequest([{ field: "endsAt", message: "Must end after it starts" }]);
    await checkWindow(auth, block.resourceId, changed, id);
    const updated = await blockedTimesRepository.update(auth.tenantId, id, auth.venueIds, {
      startsAt: changed.startsAt,
      endsAt: changed.endsAt,
      reason: changed.reason,
    });
    if (!updated) throw venueErrors.blockedTimeNotFound(id);
    return updated;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await blockedTimesRepository.remove(auth.tenantId, id, auth.venueIds)))
      throw venueErrors.blockedTimeNotFound(id);
  });
}
