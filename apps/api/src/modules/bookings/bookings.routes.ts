import {
  AVAILABILITY_SORT_FIELDS,
  AvailabilityFilters,
  Booking,
  BOOKING_SORT_FIELDS,
  BookingFilters,
  CreateBooking,
  Slot,
  UpdateBooking,
} from "@turftap/contract";

import { defineResource } from "../../lib/resource";
import * as availabilityService from "./availability.service";
import * as bookingsService from "./bookings.service";

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
