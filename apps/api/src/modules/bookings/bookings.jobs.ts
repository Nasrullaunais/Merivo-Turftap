import { defineJob } from "../../lib/jobs";
import * as bookingExpiryService from "./booking-expiry.service";

type ExpireData = { tenantId: number; bookingId: number };

export const expireBookingJob = defineJob<ExpireData>("expire-booking", ({ tenantId, bookingId }) =>
  bookingExpiryService.expire(tenantId, bookingId),
);
