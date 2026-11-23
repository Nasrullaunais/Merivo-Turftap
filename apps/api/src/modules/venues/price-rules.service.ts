import {
  type CreatePriceRule,
  minuteOfDay,
  type PriceRuleFilters,
  type UpdatePriceRule,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import * as priceRulesRepository from "./price-rules.repository";
import * as resourcesService from "./resources.service";
import { venueErrors } from "./venues.errors";

type PriceRuleSort = "startTime" | "createdAt";

/** VEN-05: a rule starts and ends on the resource's Start Interval. */
function checkFitsInterval(rule: { startTime: string; endTime: string }, intervalMinutes: number) {
  const message = `Must be on the resource's Start Interval, every ${intervalMinutes} minutes`;
  const misfits = (["startTime", "endTime"] as const).filter(
    (field) => minuteOfDay(rule[field]) % intervalMinutes !== 0,
  );
  if (misfits.length > 0)
    throw httpErrors.invalidRequest(misfits.map((field) => ({ field, message })));
}

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<PriceRuleFilters, PriceRuleSort>,
) {
  return priceRulesRepository.list(auth.tenantId, auth.venueIds, filters, page);
}

export async function get(auth: AuthContext, id: number) {
  const rule = await priceRulesRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!rule) throw venueErrors.priceRuleNotFound(id);
  return rule;
}

export function create(auth: AuthContext, input: CreatePriceRule) {
  return transaction(async () => {
    const resource = await resourcesService.get(auth, input.resourceId, "share");
    checkFitsInterval(input, resource.startIntervalMinutes);
    const clashing = await priceRulesRepository.findOverlap(auth.tenantId, input.resourceId, input);
    if (clashing) throw venueErrors.priceRuleClash(clashing);
    return priceRulesRepository.insert(auth.tenantId, input);
  });
}

export function update(auth: AuthContext, id: number, input: UpdatePriceRule) {
  return transaction(async () => {
    const rule = await get(auth, id);
    const changed = { ...rule, ...input };
    if (changed.startTime >= changed.endTime)
      throw httpErrors.invalidRequest([{ field: "endTime", message: "Must end after it starts" }]);
    const resource = await resourcesService.get(auth, rule.resourceId, "share");
    checkFitsInterval(changed, resource.startIntervalMinutes);
    const clashing = await priceRulesRepository.findOverlap(
      auth.tenantId,
      rule.resourceId,
      changed,
      id,
    );
    if (clashing) throw venueErrors.priceRuleClash(clashing);
    const updated = await priceRulesRepository.update(auth.tenantId, id, auth.venueIds, changed);
    if (!updated) throw venueErrors.priceRuleNotFound(id);
    return updated;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await priceRulesRepository.remove(auth.tenantId, id, auth.venueIds)))
      throw venueErrors.priceRuleNotFound(id);
  });
}
