import type { Resource } from "./lib/resource";
import {
  availabilityResource,
  bookingsResource,
  repeatSeriesResource,
} from "./modules/bookings/bookings.routes";
import { customersResource } from "./modules/customers/customers.routes";
import { filesResource } from "./modules/files/files.routes";
import {
  checkInsResource,
  membershipPlansResource,
  membershipsResource,
} from "./modules/memberships/memberships.routes";
import { eventsResource } from "./modules/notifications/notifications.routes";
import { paymentsResource } from "./modules/payments/payments.routes";
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
  availabilityResource,
  bookingsResource,
  repeatSeriesResource,
  paymentsResource,
  membershipPlansResource,
  membershipsResource,
  checkInsResource,
  eventsResource,
];
