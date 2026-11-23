import {
  type Booking,
  type BookingFilters,
  CENTS_PER_RUPEE,
  type CreateBooking,
  FULL_AMOUNT_PERCENT,
  type Money,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import { wallClockAt } from "../../lib/time";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as availabilityService from "./availability.service";
import { bookingErrors } from "./bookings.errors";
import { expireBookingJob } from "./bookings.jobs";
import * as bookingsRepository from "./bookings.repository";

type BookingSort = "startsAt" | "createdAt";
type StoredBooking = Omit<Booking, "bankAccount">;
type Venue = Awaited<ReturnType<typeof venuesService.get>>;

const MS_PER_MINUTE = 60 * 1000;

const isCustomerSide = (auth: AuthContext) =>
  auth.actor === "customer" || auth.actor === "assistant";

const scopeOf = (auth: AuthContext): bookingsRepository.BookingScope =>
  isCustomerSide(auth)
    ? { venueIds: undefined, ownCustomerId: auth.customerId ?? null }
    : { venueIds: auth.venueIds };

/** Read as the system, which also sees turned-off venues, so a waiting booking still shows where to pay. */
const venueOf = (auth: AuthContext, venueId: number) =>
  venuesService.get({ actor: "system", tenantId: auth.tenantId }, venueId);

const waitsForPayment = (booking: StoredBooking) => booking.status === "AWAITING_PAYMENT";

/** PAY-01: bank details go with a booking while it waits for payment. */
const withBankAccount = (booking: StoredBooking, venue?: Venue): Booking => ({
  ...booking,
  bankAccount: waitsForPayment(booking) ? (venue?.bankAccount ?? null) : null,
});

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<BookingFilters, BookingSort>,
) {
  const found = await bookingsRepository.list(auth.tenantId, scopeOf(auth), filters, page);
  const venues = new Map<number, Promise<Venue>>();
  const content = await Promise.all(
    found.content.map(async (booking) => {
      if (!waitsForPayment(booking)) return withBankAccount(booking);
      if (!venues.has(booking.venueId)) venues.set(booking.venueId, venueOf(auth, booking.venueId));
      return withBankAccount(booking, await venues.get(booking.venueId));
    }),
  );
  return { ...found, content };
}

export async function get(auth: AuthContext, id: number) {
  const booking = await bookingsRepository.findById(auth.tenantId, id, scopeOf(auth));
  if (!booking) throw bookingErrors.notFound(id);
  if (!waitsForPayment(booking)) return withBankAccount(booking);
  return withBankAccount(booking, await venueOf(auth, booking.venueId));
}

/** BKG-02: the full price, or the Advance rounded up to whole rupees. Nothing at Pay at Venue. */
function amountDueOf(price: Money, venue: Venue): number {
  if (venue.payAtVenue) return 0;
  const centsTimesPercent = price.amount * venue.advancePercent;
  return Math.ceil(centsTimesPercent / (FULL_AMOUNT_PERCENT * CENTS_PER_RUPEE)) * CENTS_PER_RUPEE;
}

function customerIdOf(auth: AuthContext): number {
  // Staff book walk-ins, which come with T10.
  if (!isCustomerSide(auth)) throw httpErrors.notAllowed();
  if (auth.customerId === undefined) throw bookingErrors.noCustomerRecord();
  return auth.customerId;
}

/** The slots asked for, priced. Someone else's booking in the way means it was just taken. */
async function quoteFor(auth: AuthContext, input: CreateBooking, now: Date) {
  const resource = await resourcesService.get(auth, input.resourceId);
  const venue = await venuesService.get(auth, resource.venueId);
  const { date, minute } = wallClockAt(input.startsAt, venue.timeZone);
  const day = await availabilityService.loadDay(auth, resource.id, date);
  const end = minute + input.slots * resource.slotMinutes;
  const slot = availabilityService.quote(day, minute, end, now);
  if (slot.startsAt.getTime() !== input.startsAt.getTime()) throw bookingErrors.notBookable();
  if (slot.free) return { resource, venue, slot };
  const freeButForBookings = availabilityService.quote({ ...day, booked: [] }, minute, end, now);
  throw freeButForBookings.free ? bookingErrors.slotTaken() : bookingErrors.notBookable();
}

/**
 * BKG-02: an online booking of one or more back-to-back slots. Two customers who both saw the
 * slot free are kept apart by the bookings_no_overlap constraint.
 */
export async function create(auth: AuthContext, input: CreateBooking) {
  const customerId = customerIdOf(auth);
  const now = new Date();
  const { resource, venue, slot } = await quoteFor(auth, input, now);
  return transaction(async () => {
    const expiresAt = venue.payAtVenue
      ? null
      : new Date(now.getTime() + venue.paymentTimeLimitMinutes * MS_PER_MINUTE);
    const booking = await bookingsRepository.insert(auth.tenantId, {
      venueId: venue.id,
      resourceId: resource.id,
      customerId,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: venue.payAtVenue ? "CONFIRMED" : "AWAITING_PAYMENT",
      source: "ONLINE",
      priceAmount: slot.price.amount,
      priceCurrency: slot.price.currency,
      amountDue: amountDueOf(slot.price, venue),
      expiresAt,
      cancellationCutOffHours: venue.cancellationCutOffHours,
    });
    if (expiresAt)
      await expireBookingJob.queue(
        { tenantId: auth.tenantId, bookingId: booking.id },
        { startAfter: expiresAt },
      );
    return withBankAccount(booking, venue);
  });
}
