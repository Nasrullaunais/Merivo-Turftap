import {
  CreateResource,
  CreateVenue,
  Resource,
  RESOURCE_SORT_FIELDS,
  ResourceFilters,
  UpdateResource,
  UpdateVenue,
  Venue,
  VENUE_SORT_FIELDS,
  VenueFilters,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as resourcesService from "./resources.service";
import * as venuesService from "./venues.service";

export const venuesResource = defineResource({
  name: "venues",
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list", "get"],
  schemas: { item: Venue, create: CreateVenue, update: UpdateVenue, filters: VenueFilters },
  sort: { fields: VENUE_SORT_FIELDS, default: "name,asc" },
  service: venuesService,
});

export const resourcesResource = defineResource({
  name: "resources",
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list", "get"],
  schemas: {
    item: Resource,
    create: CreateResource,
    update: UpdateResource,
    filters: ResourceFilters,
  },
  sort: { fields: RESOURCE_SORT_FIELDS, default: "name,asc" },
  service: resourcesService,
});
