import { defineJob } from "../../lib/jobs";
import * as bookingExpiryService from "./booking-expiry.service";
import * as bookingReminderService from "./booking-reminder.service";

type BookingJobData = { tenantId: number; bookingId: number };

export const expireBookingJob = defineJob<BookingJobData>(
  "expire-booking",
  ({ tenantId, bookingId }) => bookingExpiryService.expire(tenantId, bookingId),
);

export const bookingReminderJob = defineJob<BookingJobData>(
  "booking-reminder",
  ({ tenantId, bookingId }) => bookingReminderService.remind(tenantId, bookingId),
);
