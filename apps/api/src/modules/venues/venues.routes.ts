import {
  BLOCKED_TIME_SORT_FIELDS,
  BlockedTime,
  BlockedTimeFilters,
  CLOSED_DATE_SORT_FIELDS,
  ClosedDate,
  ClosedDateFilters,
  CreateBlockedTime,
  CreateClosedDate,
  CreatePhoto,
  CreatePriceRule,
  CreateResource,
  CreateVenue,
  Photo,
  PHOTO_SORT_FIELDS,
  PhotoFilters,
  PRICE_RULE_SORT_FIELDS,
  PriceRule,
  PriceRuleFilters,
  Resource,
  RESOURCE_SORT_FIELDS,
  ResourceFilters,
  UpdateBlockedTime,
  UpdateClosedDate,
  UpdatePhoto,
  UpdatePriceRule,
  UpdateResource,
  UpdateVenue,
  Venue,
  VENUE_SORT_FIELDS,
  VenueFilters,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as blockedTimesService from "./blocked-times.service";
import * as closedDatesService from "./closed-dates.service";
import * as photosService from "./photos.service";
import * as priceRulesService from "./price-rules.service";
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

export const priceRulesResource = defineResource({
  name: "price-rules",
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list"],
  schemas: {
    item: PriceRule,
    create: CreatePriceRule,
    update: UpdatePriceRule,
    filters: PriceRuleFilters,
  },
  sort: { fields: PRICE_RULE_SORT_FIELDS, default: "startTime,asc" },
  service: priceRulesService,
});

export const closedDatesResource = defineResource({
  name: "closed-dates",
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list"],
  schemas: {
    item: ClosedDate,
    create: CreateClosedDate,
    update: UpdateClosedDate,
    filters: ClosedDateFilters,
  },
  sort: { fields: CLOSED_DATE_SORT_FIELDS, default: "date,asc" },
  service: closedDatesService,
});

export const blockedTimesResource = defineResource({
  name: "blocked-times",
  operations: ["list", "get", "create", "update", "delete"],
  schemas: {
    item: BlockedTime,
    create: CreateBlockedTime,
    update: UpdateBlockedTime,
    filters: BlockedTimeFilters,
  },
  sort: { fields: BLOCKED_TIME_SORT_FIELDS, default: "startsAt,asc" },
  service: blockedTimesService,
});

export const photosResource = defineResource({
  name: "photos",
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list"],
  schemas: { item: Photo, create: CreatePhoto, update: UpdatePhoto, filters: PhotoFilters },
  sort: { fields: PHOTO_SORT_FIELDS, default: "position,asc" },
  service: photosService,
});
