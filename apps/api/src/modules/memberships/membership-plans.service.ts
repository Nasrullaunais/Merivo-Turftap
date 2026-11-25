import type {
  CreateMembershipPlan,
  MembershipPlanFilters,
  UpdateMembershipPlan,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import * as venuesService from "../venues/venues.service";
import * as membershipPlansRepository from "./membership-plans.repository";
import { membershipErrors } from "./memberships.errors";

type PlanSort = "name" | "createdAt";

/** Staff and background jobs see plans that were turned off; everyone else only sees ones on sale. */
const seesInactive = (auth: AuthContext) =>
  auth.actor === "staff" || auth.actor === "platform_admin" || auth.actor === "system";

export function list(
  auth: AuthContext,
  { filters, page }: ListQuery<MembershipPlanFilters, PlanSort>,
) {
  const active = seesInactive(auth) ? filters.active : true;
  return membershipPlansRepository.list(auth.tenantId, auth.venueIds, { ...filters, active }, page);
}

export async function get(auth: AuthContext, id: number) {
  const plan = await membershipPlansRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!plan || (!plan.active && !seesInactive(auth))) throw membershipErrors.planNotFound(id);
  return plan;
}

export function create(auth: AuthContext, input: CreateMembershipPlan) {
  return transaction(async () => {
    const venue = await venuesService.get(auth, input.venueId);
    if (!venue.hasGym) throw membershipErrors.noGym(venue.name);
    return membershipPlansRepository.insert(auth.tenantId, input);
  });
}

export function update(auth: AuthContext, id: number, input: UpdateMembershipPlan) {
  if (Object.keys(input).length === 0) return get(auth, id);
  return transaction(async () => {
    const plan = await membershipPlansRepository.update(auth.tenantId, id, auth.venueIds, input);
    if (!plan) throw membershipErrors.planNotFound(id);
    return plan;
  });
}

export function remove(auth: AuthContext, id: number) {
  return transaction(async () => {
    if (!(await membershipPlansRepository.deactivate(auth.tenantId, id, auth.venueIds)))
      throw membershipErrors.planNotFound(id);
  });
}
