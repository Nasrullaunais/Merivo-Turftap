import {
  CreateMembershipPlan,
  MEMBERSHIP_PLAN_SORT_FIELDS,
  MembershipPlan,
  MembershipPlanFilters,
  UpdateMembershipPlan,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as membershipPlansService from "./membership-plans.service";

export const membershipPlansResource = defineResource({
  name: "membership-plans",
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list", "get"],
  schemas: {
    item: MembershipPlan,
    create: CreateMembershipPlan,
    update: UpdateMembershipPlan,
    filters: MembershipPlanFilters,
  },
  sort: { fields: MEMBERSHIP_PLAN_SORT_FIELDS, default: "name,asc" },
  service: membershipPlansService,
});
