import type { Resource } from "./lib/resource";
import { filesResource } from "./modules/files/files.routes";
import { meResource } from "./modules/platform/platform.routes";
import { staffResource } from "./modules/staff/staff.routes";
import {
  blockedTimesResource,
  closedDatesResource,
  photosResource,
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
  blockedTimesResource,
  photosResource,
  filesResource,
];
