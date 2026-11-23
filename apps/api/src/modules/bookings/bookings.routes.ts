import { AVAILABILITY_SORT_FIELDS, AvailabilityFilters, Slot } from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as availabilityService from "./availability.service";

export const availabilityResource = defineResource({
  name: "availability",
  operations: ["list"],
  public: ["list"],
  schemas: { item: Slot, filters: AvailabilityFilters },
  sort: { fields: AVAILABILITY_SORT_FIELDS, default: "startsAt,asc" },
  service: availabilityService,
});
