import type {
  CreateRepeatSeries,
  RepeatSeries,
  RepeatSeriesFilters,
  UpdateRepeatSeries,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { type ListQuery, statusChangedMeanwhile } from "../../lib/resource";
import { addDays, wallClockAt } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import * as customersService from "../customers/customers.service";
import * as eventsService from "../notifications/events.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as availabilityService from "./availability.service";
import { bookingErrors } from "./bookings.errors";
import * as bookingsRepository from "./bookings.repository";
import { tellCustomer } from "./bookings.service";
import { repeatSeriesTransitions } from "./bookings.transitions";
import * as repeatSeriesRepository from "./repeat-series.repository";

type RepeatSeriesSort = "firstDate" | "createdAt";
type StoredSeries = Omit<RepeatSeries, "customerName" | "customerPhone">;

const DAYS_PER_WEEK = 7;

async function withContacts(tenantId: number, series: StoredSeries[]): Promise<RepeatSeries[]> {
  const contacts = await customersService.contactsOf(
    tenantId,
    series.map((one) => one.customerId),
  );
  return series.map((one) => {
    const contact = contacts.get(one.customerId)!;
    return { ...one, customerName: contact.name, customerPhone: contact.phone };
  });
}

const withContact = async (tenantId: number, series: StoredSeries) =>
  (await withContacts(tenantId, [series]))[0]!;

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<RepeatSeriesFilters, RepeatSeriesSort>,
) {
  const found = await repeatSeriesRepository.list(auth.tenantId, auth.venueIds, filters, page);
  return { ...found, content: await withContacts(auth.tenantId, found.content) };
}

export async function get(auth: AuthContext, id: number) {
  const series = await repeatSeriesRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!series) throw bookingErrors.seriesNotFound(id);
  return withContact(auth.tenantId, series);
}

/**
 * BKG-09: every week is checked and booked in one transaction, confirmed and paid later (D-09).
 * Any week that isn't free refuses the whole series and names the dates (D-10).
 */
export function create(auth: AuthContext, input: CreateRepeatSeries) {
  return transaction(async () => {
    const resource = await resourcesService.get(auth, input.resourceId, "update");
    const venue = await venuesService.get(auth, resource.venueId);
    const { date: firstDate, minute } = wallClockAt(input.startsAt, venue.timeZone);
    const end = minute + input.slots * resource.slotMinutes;
    const now = new Date();

    // A booked, blocked or closed week is a clash; a time that never fits refuses the whole series.
    const firstDay = await availabilityService.loadDay(auth, resource.id, firstDate);
    const unbooked = { ...firstDay, closed: false, blocked: [], booked: [] };
    const fits = availabilityService.quote(unbooked, minute, end, now);
    if (!fits.free || fits.startsAt.getTime() !== input.startsAt.getTime())
      throw bookingErrors.notBookable();

    const skipped = new Set(input.skipDates);
    const dates = Array.from({ length: input.weeks }, (_, week) =>
      addDays(firstDate, week * DAYS_PER_WEEK),
    ).filter((date) => !skipped.has(date));
    if (dates.length === 0) throw bookingErrors.seriesAllSkipped();
    const weeks = await Promise.all(
      dates.map(async (date) => {
        const day = await availabilityService.loadDay(auth, resource.id, date);
        return { date, slot: availabilityService.quote(day, minute, end, now) };
      }),
    );
    const clashing = weeks.filter((week) => !week.slot.free).map((week) => week.date);
    if (clashing.length > 0) throw bookingErrors.seriesClashes(clashing);

    const customer = await customersService.findOrCreateByPhone(
      auth,
      input.customerPhone,
      input.customerName,
    );
    const series = await repeatSeriesRepository.insert(auth.tenantId, {
      venueId: venue.id,
      resourceId: resource.id,
      customerId: customer.id,
      firstDate,
      startMinute: minute,
      slots: input.slots,
      weeks: input.weeks,
      status: "ACTIVE",
      seriesPaymentDaysBefore: venue.seriesPaymentDaysBefore,
      advancePercent: venue.advancePercent,
    });
    for (const { slot } of weeks) {
      const booking = await bookingsRepository.insert(auth.tenantId, {
        venueId: venue.id,
        resourceId: resource.id,
        customerId: customer.id,
        repeatSeriesId: series.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "CONFIRMED",
        source: "WALK_IN",
        priceAmount: slot.price.amount,
        priceCurrency: slot.price.currency,
        amountDue: 0,
        expiresAt: null,
        cancellationCutOffHours: venue.cancellationCutOffHours,
      });
      eventsService.publish(auth, "booking.changed", booking);
    }
    return withContact(auth.tenantId, series);
  });
}

/** BKG-09: cancelling the series cancels its bookings that haven't started; past ones stay. */
export async function update(auth: AuthContext, id: number, input: UpdateRepeatSeries) {
  const series = await get(auth, id);
  repeatSeriesTransitions.check(auth.actor, series.status, input.status);
  const { cancelReason } = input;
  if (!cancelReason) throw bookingErrors.cancelReasonMissing();
  return transaction(async () => {
    const cancelled = await repeatSeriesRepository.setStatus(
      auth.tenantId,
      id,
      series.status,
      input.status,
      { cancelReason },
    );
    if (!cancelled) throw statusChangedMeanwhile();
    const bookings = await bookingsRepository.cancelUpcomingInSeries(
      auth.tenantId,
      id,
      cancelReason,
    );
    for (const booking of bookings) eventsService.publish(auth, "booking.changed", booking);
    if (bookings[0])
      await tellCustomer(auth, bookings[0], WHATSAPP_TEMPLATES.seriesCancelled, [
        String(bookings.length),
        cancelReason,
      ]);
    return withContact(auth.tenantId, cancelled);
  });
}
