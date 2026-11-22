import type { CreatePriceRule, PriceRuleFilters, UpdatePriceRule } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import * as priceRulesRepository from "./price-rules.repository";
import * as resourcesService from "./resources.service";
import { venueErrors } from "./venues.errors";

type PriceRuleSort = "startTime" | "createdAt";

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<PriceRuleFilters, PriceRuleSort>,
) {
  return priceRulesRepository.list(auth.tenantId, filters, page);
}

export async function get(auth: AuthContext, id: number) {
  const rule = await priceRulesRepository.findById(auth.tenantId, id);
  if (!rule) throw venueErrors.priceRuleNotFound(id);
  return rule;
}

export function create(auth: AuthContext, input: CreatePriceRule) {
  return transaction(async () => {
    await resourcesService.get(auth, input.resourceId);
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
    const clashing = await priceRulesRepository.findOverlap(
      auth.tenantId,
      rule.resourceId,
      changed,
      id,
    );
    if (clashing) throw venueErrors.priceRuleClash(clashing);
    const updated = await priceRulesRepository.update(auth.tenantId, id, changed);
    if (!updated) throw venueErrors.priceRuleNotFound(id);
    return updated;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await priceRulesRepository.remove(auth.tenantId, id)))
      throw venueErrors.priceRuleNotFound(id);
  });
}
