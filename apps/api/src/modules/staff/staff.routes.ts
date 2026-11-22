import {
  CreateStaff,
  Staff,
  STAFF_SORT_FIELDS,
  StaffFilters,
  UpdateStaff,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as staffService from "./staff.service";

export const staffResource = defineResource({
  name: "staff",
  operations: ["list", "get", "create", "update", "delete"],
  schemas: { item: Staff, create: CreateStaff, update: UpdateStaff, filters: StaffFilters },
  sort: { fields: STAFF_SORT_FIELDS, default: "createdAt,asc" },
  service: staffService,
});
