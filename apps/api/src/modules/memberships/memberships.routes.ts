import {
  CreateMembership,
  CreateMembershipPlan,
  Membership,
  MEMBERSHIP_PLAN_SORT_FIELDS,
  MEMBERSHIP_SORT_FIELDS,
  MembershipFilters,
  MembershipPlan,
  MembershipPlanFilters,
  UpdateMembership,
  UpdateMembershipPlan,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as membershipPlansService from "./membership-plans.service";
import * as membershipsService from "./memberships.service";

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

export const membershipsResource = defineResource({
  name: "memberships",
  operations: ["list", "get", "create", "update"],
  forCustomers: ["list", "get", "create", "update"],
  schemas: {
    item: Membership,
    create: CreateMembership,
    update: UpdateMembership,
    filters: MembershipFilters,
  },
  sort: { fields: MEMBERSHIP_SORT_FIELDS, default: "startsOn,desc" },
  service: membershipsService,
});
