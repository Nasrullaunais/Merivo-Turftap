import type { Resource } from "./lib/resource";
import { meResource } from "./modules/platform/platform.routes";
import { staffResource } from "./modules/staff/staff.routes";
import { resourcesResource, venuesResource } from "./modules/venues/venues.routes";

export const RESOURCES: Resource[] = [meResource, staffResource, venuesResource, resourcesResource];
