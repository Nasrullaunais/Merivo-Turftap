import type { CreateVenue, UpdateVenue, VenueFilters } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import * as gymService from "../memberships/gym.service";
import { venueErrors } from "./venues.errors";
import * as venuesRepository from "./venues.repository";

type VenueSort = "name" | "createdAt";

/** Staff and background jobs see venues that were turned off; everyone else only sees open ones. */
const seesInactive = (auth: AuthContext) =>
  auth.actor === "staff" || auth.actor === "platform_admin" || auth.actor === "system";

export function list(auth: AuthContext, { filters, page }: ListQuery<VenueFilters, VenueSort>) {
  const active = seesInactive(auth) ? filters.active : true;
  return venuesRepository.list(auth.tenantId, auth.venueIds, { active }, page);
}

export async function get(auth: AuthContext, id: number) {
  const venue = await venuesRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!venue || (!venue.active && !seesInactive(auth))) throw venueErrors.notFound(id);
  return venue;
}

export function create(auth: AuthContext, input: CreateVenue) {
  return transaction(() => venuesRepository.insert(auth.tenantId, input));
}

export function update(auth: AuthContext, id: number, input: UpdateVenue) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    if (input.hasGym === false) {
      const before = await get(auth, id);
      if (before.hasGym && (await gymService.inUse(auth, before))) throw venueErrors.gymInUse();
    }
    const venue = await venuesRepository.update(auth.tenantId, id, auth.venueIds, input);
    if (!venue) throw venueErrors.notFound(id);
    return venue;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await venuesRepository.deactivate(auth.tenantId, id, auth.venueIds)))
      throw venueErrors.notFound(id);
  });
}

/** Refuses the first id that isn't a venue in this tenant, the same way `get` would. */
export async function checkExist(auth: AuthContext, ids: number[]) {
  const existing = await venuesRepository.findExistingIds(auth.tenantId, auth.venueIds, ids);
  const missing = ids.find((id) => !existing.has(id));
  if (missing !== undefined) throw venueErrors.notFound(missing);
}
