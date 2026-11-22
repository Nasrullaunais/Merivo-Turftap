import type { Resource } from "./lib/resource";
import { venuesResource } from "./modules/venues/venues.routes";

export const RESOURCES: Resource[] = [venuesResource];
