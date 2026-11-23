import type { Resource } from "./lib/resource";
import { customersResource } from "./modules/customers/customers.routes";
import { filesResource } from "./modules/files/files.routes";
import { meResource, whatsappNumbersResource } from "./modules/platform/platform.routes";
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
  whatsappNumbersResource,
  staffResource,
  venuesResource,
  closedDatesResource,
  resourcesResource,
  priceRulesResource,
  blockedTimesResource,
  photosResource,
  filesResource,
  customersResource,
];
