import type { Resource } from "./lib/resource";
import { meResource } from "./modules/platform/platform.routes";
import { staffResource } from "./modules/staff/staff.routes";
import {
  closedDatesResource,
  priceRulesResource,
  resourcesResource,
  venuesResource,
} from "./modules/venues/venues.routes";

export const RESOURCES: Resource[] = [
  meResource,
  staffResource,
  venuesResource,
  closedDatesResource,
  resourcesResource,
  priceRulesResource,
];
