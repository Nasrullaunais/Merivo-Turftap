import { beforeAll, describe, expect, it } from "bun:test";

import { type CreateResource, minuteOfDay } from "@turftap/contract";
import { sql } from "drizzle-orm";

import type { AuthContext } from "../../lib/auth/context";
import { db } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  createTenant,
  queuedMessagesFor,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as availabilityService from "./availability.service";
import * as bookingReminderService from "./booking-reminder.service";
import * as bookingsService from "./bookings.service";
import * as repeatSeriesService from "./repeat-series.service";

const TIME_ZONE = "Asia/Colombo";
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const REMINDER_MS = 3 * MS_PER_HOUR;
const SERIES_WEEKS = 3;
const STARTS_PER_DAY = 96;

const at = (days: number, time: string, timeZone = TIME_ZONE) =>
  instantAt(addDays(todayIn(timeZone), days), minuteOfDay(time), timeZone);

const reminderJobsFor = async (bookingId: number) => {
  const { rows } = await db().execute(
    sql`select start_after from pgboss.job where name = 'booking-reminder' and (data->>'bookingId')::int = ${bookingId}`,
  );
  return rows.map((row) => new Date(row.start_after as string));
};

describe("BKG-10 booking reminders", () => {
  let tenant: TestTenant;
  const manager = () => tenant.manager.auth;

  beforeAll(async () => {
    tenant = await createTenant();
  });

  async function newCourt(
    venue: Parameters<typeof venueInput>[0] = {},
    { opens = "06:00", closes = "23:00", slotMinutes = 60 as CreateResource["slotMinutes"] } = {},
  ) {
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({ weekday, opens, closes }));
    const { id: venueId, name: venueName } = await venuesService.create(
      tenant.owner.auth,
      venueInput({ openingHours, ...venue }),
    );
    const resource = await resourcesService.create(
      tenant.owner.auth,
      resourceInput(venueId, { slotMinutes, startIntervalMinutes: 15 }),
    );
    return { venueName, resourceName: resource.name, resourceId: resource.id };
  }

  async function newCustomer(): Promise<AuthContext> {
    const phone = uniquePhone();
    const customer = await customersService.create(tenant.owner.auth, { name: "Nimal", phone });
    return { actor: "customer", tenantId: tenant.id, phone, customerId: customer.id };
  }

  const walkIn = (resourceId: number, startsAt: Date) =>
    bookingsService.create(manager(), {
      resourceId,
      startsAt,
      slots: 1,
      walkIn: { customerName: "Kasun Silva", customerPhone: uniquePhone(), payment: "PAY_LATER" },
    });

  /** The first free start at least an hour from now, today or tomorrow. */
  async function firstFreeStartAnHourFromNow(resourceId: number) {
    const soonest = Date.now() + MS_PER_HOUR;
    for (const days of [0, 1]) {
      const { content } = await availabilityService.list(manager(), {
        filters: { resourceId, date: addDays(todayIn(TIME_ZONE), days) },
        page: { page: 0, size: STARTS_PER_DAY, sort: { field: "startsAt", direction: "asc" } },
      });
      const slot = content.find((s) => s.free && s.startsAt.getTime() >= soonest);
      if (slot) return slot.startsAt;
    }
    throw new Error("No free start today or tomorrow");
  }

  const remindAt = (startsAt: Date) => new Date(startsAt.getTime() - REMINDER_MS);

  it("walkIn_queuesAReminderThreeHoursBeforeStart", async () => {
    const { resourceId } = await newCourt();
    const booking = await walkIn(resourceId, at(2, "18:00"));
    expect(await reminderJobsFor(booking.id)).toEqual([remindAt(booking.startsAt)]);
  });

  it("onlineBookingAtAPayAtVenueVenue_isConfirmedAndQueuesAReminder", async () => {
    const { resourceId } = await newCourt({ payAtVenue: true });
    const booking = await bookingsService.create(await newCustomer(), {
      resourceId,
      startsAt: at(2, "09:00"),
      slots: 1,
    });
    expect(booking.status).toBe("CONFIRMED");
    expect(await reminderJobsFor(booking.id)).toEqual([remindAt(booking.startsAt)]);
  });

  it("onlineBookingWaitingForPayment_queuesNoReminderYet", async () => {
    const { resourceId } = await newCourt();
    const booking = await bookingsService.create(await newCustomer(), {
      resourceId,
      startsAt: at(2, "09:00"),
      slots: 1,
    });
    expect(booking.status).toBe("AWAITING_PAYMENT");
    expect(await reminderJobsFor(booking.id)).toEqual([]);
  });

  it("repeatSeries_queuesAReminderForEveryWeek", async () => {
    const { resourceId } = await newCourt();
    const series = await repeatSeriesService.create(manager(), {
      resourceId,
      startsAt: at(2, "20:00"),
      slots: 1,
      weeks: SERIES_WEEKS,
      customerName: "Kasun Silva",
      customerPhone: uniquePhone(),
      skipDates: [],
    });
    const { content } = await bookingsService.list(manager(), {
      filters: { repeatSeriesId: series.id },
      page: { page: 0, size: SERIES_WEEKS, sort: { field: "startsAt", direction: "asc" } },
    });
    expect(content).toHaveLength(SERIES_WEEKS);
    for (const booking of content)
      expect(await reminderJobsFor(booking.id)).toEqual([remindAt(booking.startsAt)]);
  });

  it("walkInLessThanThreeHoursAway_queuesNoReminder", async () => {
    const allDay = { opens: "00:00", closes: "23:59", slotMinutes: 15 } as const;
    const { resourceId } = await newCourt({}, allDay);
    const startsAt = await firstFreeStartAnHourFromNow(resourceId);
    expect(startsAt.getTime() - Date.now()).toBeLessThan(REMINDER_MS);
    const booking = await walkIn(resourceId, startsAt);
    expect(booking.status).toBe("CONFIRMED");
    expect(await reminderJobsFor(booking.id)).toEqual([]);
  });

  it("remind_confirmedBooking_sendsTheVenueResourceAndLocalTime", async () => {
    const { venueName, resourceName, resourceId } = await newCourt();
    const booking = await walkIn(resourceId, at(3, "18:30"));
    await bookingReminderService.remind(tenant.id, booking.id);
    expect(await queuedMessagesFor(booking.customerId)).toEqual([
      {
        tenantId: tenant.id,
        customerId: booking.customerId,
        template: WHATSAPP_TEMPLATES.bookingReminder,
        values: [venueName, resourceName, expect.stringMatching(/ 18:30$/)],
      },
    ]);
  });

  it("remind_cancelledBooking_doesNothing", async () => {
    const { resourceId } = await newCourt();
    const booking = await walkIn(resourceId, at(3, "10:00"));
    await bookingsService.update(manager(), booking.id, {
      status: "CANCELLED",
      cancelReason: "Rain",
    });
    const before = await queuedMessagesFor(booking.customerId);
    await bookingReminderService.remind(tenant.id, booking.id);
    expect(await queuedMessagesFor(booking.customerId)).toEqual(before);
  });
});
