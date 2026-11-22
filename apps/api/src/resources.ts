import type { Resource } from "./lib/resource";
import { meResource } from "./modules/platform/platform.routes";
import { venuesResource } from "./modules/venues/venues.routes";

export const RESOURCES: Resource[] = [meResource, venuesResource];
