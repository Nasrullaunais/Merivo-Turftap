import type { CreateResource, ResourceFilters, UpdateResource } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import * as resourcesRepository from "./resources.repository";
import { venueErrors } from "./venues.errors";
import * as venuesService from "./venues.service";

type ResourceSort = "name" | "createdAt";

/** Staff see resources that were turned off; everyone else only sees ones that can be booked. */
const seesInactive = (auth: AuthContext) =>
  auth.actor === "staff" || auth.actor === "platform_admin";

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<ResourceFilters, ResourceSort>,
) {
  const active = seesInactive(auth) ? filters.active : true;
  return resourcesRepository.list(auth.tenantId, { ...filters, active }, page);
}

export async function get(auth: AuthContext, id: number) {
  const resource = await resourcesRepository.findById(auth.tenantId, id);
  if (!resource || (!resource.active && !seesInactive(auth)))
    throw venueErrors.resourceNotFound(id);
  return resource;
}

export function create(auth: AuthContext, input: CreateResource) {
  return transaction(async () => {
    await venuesService.get(auth, input.venueId);
    return resourcesRepository.insert(auth.tenantId, input);
  });
}

export function update(auth: AuthContext, id: number, input: UpdateResource) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    const resource = await resourcesRepository.update(auth.tenantId, id, input);
    if (!resource) throw venueErrors.resourceNotFound(id);
    return resource;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await resourcesRepository.deactivate(auth.tenantId, id)))
      throw venueErrors.resourceNotFound(id);
  });
}
