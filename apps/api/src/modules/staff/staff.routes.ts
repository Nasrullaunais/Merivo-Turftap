import { CreateStaff, Staff, STAFF_SORT_FIELDS, StaffFilters } from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as staffService from "./staff.service";

export const staffResource = defineResource({
  name: "staff",
  operations: ["list", "get", "create"],
  schemas: { item: Staff, create: CreateStaff, filters: StaffFilters },
  sort: { fields: STAFF_SORT_FIELDS, default: "createdAt,asc" },
  service: staffService,
});
