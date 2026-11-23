import {
  type CreateResource,
  INTERVAL_LONGER_THAN_SLOT,
  type ResourceFilters,
  type UpdateResource,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import * as priceRulesRepository from "./price-rules.repository";
import * as resourcesRepository from "./resources.repository";
import { venueErrors } from "./venues.errors";
import * as venuesService from "./venues.service";

type ResourceSort = "name" | "createdAt";

/** Staff and background jobs see resources that were turned off; everyone else only sees ones that can be booked. */
const seesInactive = (auth: AuthContext) =>
  auth.actor === "staff" || auth.actor === "platform_admin" || auth.actor === "system";

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<ResourceFilters, ResourceSort>,
) {
  const active = seesInactive(auth) ? filters.active : true;
  return resourcesRepository.list(auth.tenantId, auth.venueIds, { ...filters, active }, page);
}

/** With `lock: "share"`, the resource's settings can't change until the transaction ends. */
export async function get(auth: AuthContext, id: number, lock?: "share") {
  const resource = await resourcesRepository.findById(auth.tenantId, id, auth.venueIds, lock);
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
    const saved = await resourcesRepository.findById(auth.tenantId, id, auth.venueIds, "update");
    if (!saved) throw venueErrors.resourceNotFound(id);
    const { slotMinutes, startIntervalMinutes } = { ...saved, ...input };
    if (startIntervalMinutes > slotMinutes)
      throw httpErrors.invalidRequest([
        { field: "startIntervalMinutes", message: INTERVAL_LONGER_THAN_SLOT },
      ]);
    if (startIntervalMinutes !== saved.startIntervalMinutes) {
      const misfit = await priceRulesRepository.findOffInterval(
        auth.tenantId,
        id,
        startIntervalMinutes,
      );
      if (misfit) throw venueErrors.intervalMisfitsPriceRule(misfit);
    }
    const resource = await resourcesRepository.update(auth.tenantId, id, auth.venueIds, input);
    if (!resource) throw venueErrors.resourceNotFound(id);
    return resource;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await resourcesRepository.deactivate(auth.tenantId, id, auth.venueIds)))
      throw venueErrors.resourceNotFound(id);
  });
}
