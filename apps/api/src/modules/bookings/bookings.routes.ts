import {
  AVAILABILITY_SORT_FIELDS,
  AvailabilityFilters,
  Booking,
  BOOKING_SORT_FIELDS,
  BookingFilters,
  CreateBooking,
  CreateRepeatSeries,
  REPEAT_SERIES_SORT_FIELDS,
  RepeatSeries,
  RepeatSeriesFilters,
  Slot,
  UpdateBooking,
  UpdateRepeatSeries,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as availabilityService from "./availability.service";
import * as bookingsService from "./bookings.service";
import * as repeatSeriesService from "./repeat-series.service";

export const bookingsResource = defineResource({
  name: "bookings",
  operations: ["list", "get", "create", "update"],
  forCustomers: ["list", "get", "create", "update"],
  schemas: { item: Booking, create: CreateBooking, update: UpdateBooking, filters: BookingFilters },
  sort: { fields: BOOKING_SORT_FIELDS, default: "startsAt,asc" },
  service: bookingsService,
});

export const availabilityResource = defineResource({
  name: "availability",
  operations: ["list"],
  public: ["list"],
  schemas: { item: Slot, filters: AvailabilityFilters },
  sort: { fields: AVAILABILITY_SORT_FIELDS, default: "startsAt,asc" },
  service: availabilityService,
});

export const repeatSeriesResource = defineResource({
  name: "repeat-series",
  operations: ["list", "get", "create", "update"],
  schemas: {
    item: RepeatSeries,
    create: CreateRepeatSeries,
    update: UpdateRepeatSeries,
    filters: RepeatSeriesFilters,
  },
  sort: { fields: REPEAT_SERIES_SORT_FIELDS, default: "firstDate,asc" },
  service: repeatSeriesService,
});
