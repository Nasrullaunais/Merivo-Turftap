import type { CreateVenue, UpdateVenue, VenueFilters } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import { venueErrors } from "./venues.errors";
import * as venuesRepository from "./venues.repository";

type VenueSort = "name" | "createdAt";

/** Staff see venues that were turned off; everyone else only sees open ones. */
const seesInactive = (auth: AuthContext) =>
  auth.actor === "staff" || auth.actor === "platform_admin";

export function list(auth: AuthContext, { filters, page }: ListQuery<VenueFilters, VenueSort>) {
  const active = seesInactive(auth) ? filters.active : true;
  return venuesRepository.list(auth.tenantId, { active }, page);
}

export async function get(auth: AuthContext, id: number) {
  const venue = await venuesRepository.findById(auth.tenantId, id);
  if (!venue || (!venue.active && !seesInactive(auth))) throw venueErrors.notFound(id);
  return venue;
}

export function create(auth: AuthContext, input: CreateVenue) {
  return transaction(() => venuesRepository.insert(auth.tenantId, input));
}

export function update(auth: AuthContext, id: number, input: UpdateVenue) {
  return transaction(async () => {
    const venue = await venuesRepository.update(auth.tenantId, id, input);
    if (!venue) throw venueErrors.notFound(id);
    return venue;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await venuesRepository.deactivate(auth.tenantId, id))) throw venueErrors.notFound(id);
  });
}
