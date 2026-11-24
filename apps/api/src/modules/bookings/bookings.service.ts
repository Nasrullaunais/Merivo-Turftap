import {
  type Booking,
  type BookingFilters,
  CENTS_PER_RUPEE,
  type CreateBooking,
  FULL_AMOUNT_PERCENT,
  HOLDING_STATUSES,
  type Money,
  type UpdateBooking,
  type WalkIn,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { type ListQuery, statusChangedMeanwhile } from "../../lib/resource";
import { describeInstant, wallClockAt } from "../../lib/time";
import { WHATSAPP_TEMPLATES, type WhatsAppTemplate } from "../../ports/messaging-channel";
import * as customersService from "../customers/customers.service";
import * as eventsService from "../notifications/events.service";
import * as notificationsService from "../notifications/notifications.service";
import * as bookingPaymentsService from "../payments/booking-payments.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as availabilityService from "./availability.service";
import { bookingErrors } from "./bookings.errors";
import { expireBookingJob } from "./bookings.jobs";
import * as bookingsRepository from "./bookings.repository";
import { bookingTransitions } from "./bookings.transitions";

type BookingSort = "startsAt" | "createdAt";
type StoredBooking = Omit<
  Booking,
  "bankAccount" | "customerName" | "customerPhone" | "paid" | "balance"
>;
type Details = { contact: { name: string; phone: string }; paidCents: number };
type Venue = Awaited<ReturnType<typeof venuesService.get>>;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

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
const holdsSlots = (booking: StoredBooking) =>
  (HOLDING_STATUSES as readonly string[]).includes(booking.status);

/** Who the booking is for, what is paid and left (PAY-08), and bank details (PAY-01). */
function replyOf(booking: StoredBooking, { contact, paidCents }: Details, venue?: Venue): Booking {
  const { currency } = booking.price;
  const balanceCents = holdsSlots(booking) ? booking.price.amount - paidCents : 0;
  return {
    ...booking,
    customerName: contact.name,
    customerPhone: contact.phone,
    paid: { amount: paidCents, currency },
    balance: { amount: balanceCents, currency },
    bankAccount: waitsForPayment(booking) ? (venue?.bankAccount ?? null) : null,
  };
}

async function detailsOf(auth: AuthContext, bookings: StoredBooking[]) {
  const contacts = await customersService.contactsOf(
    auth.tenantId,
    bookings.map((booking) => booking.customerId),
  );
  const paidFor = await bookingPaymentsService.paidFor(
    auth,
    bookings.map((booking) => booking.id),
  );
  return (booking: StoredBooking): Details => ({
    contact: contacts.get(booking.customerId)!,
    paidCents: paidFor(booking.id),
  });
}

const detailsOfOne = async (auth: AuthContext, booking: StoredBooking) =>
  (await detailsOf(auth, [booking]))(booking);

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<BookingFilters, BookingSort>,
) {
  const found = await bookingsRepository.list(auth.tenantId, scopeOf(auth), filters, page);
  const details = await detailsOf(auth, found.content);
  const venues = new Map<number, Promise<Venue>>();
  const content = await Promise.all(
    found.content.map(async (booking) => {
      if (!waitsForPayment(booking)) return replyOf(booking, details(booking));
      if (!venues.has(booking.venueId)) venues.set(booking.venueId, venueOf(auth, booking.venueId));
      return replyOf(booking, details(booking), await venues.get(booking.venueId));
    }),
  );
  return { ...found, content };
}

/** With `lock`, changes to the booking and payments on it wait until this transaction ends. */
export async function get(auth: AuthContext, id: number, lock?: "update") {
  const booking = await bookingsRepository.findById(auth.tenantId, id, scopeOf(auth), lock);
  if (!booking) throw bookingErrors.notFound(id);
  const details = await detailsOfOne(auth, booking);
  if (!waitsForPayment(booking)) return replyOf(booking, details);
  return replyOf(booking, details, await venueOf(auth, booking.venueId));
}

/** BKG-02: the full price, or the Advance rounded up to whole rupees. Nothing at Pay at Venue. */
function amountDueOf(price: Money, venue: Venue): number {
  if (venue.payAtVenue) return 0;
  const centsTimesPercent = price.amount * venue.advancePercent;
  return Math.ceil(centsTimesPercent / (FULL_AMOUNT_PERCENT * CENTS_PER_RUPEE)) * CENTS_PER_RUPEE;
}

function ownCustomerIdOf(auth: AuthContext): number {
  if (!isCustomerSide(auth)) throw bookingErrors.walkInMissing();
  if (auth.customerId === undefined) throw bookingErrors.noCustomerRecord();
  return auth.customerId;
}

/** The slots asked for, priced. Someone else's booking in the way means it was just taken. */
async function quoteFor(auth: AuthContext, input: CreateBooking, now: Date) {
  const resource = await resourcesService.get(auth, input.resourceId, "update");
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
 * BKG-02: an online booking of one or more back-to-back slots. The resource stays locked from
 * the free-slot check to the insert, so a booking or Blocked Time saved meanwhile waits.
 */
export async function create(auth: AuthContext, input: CreateBooking) {
  if (input.walkIn) return createWalkIn(auth, input, input.walkIn);
  const customerId = ownCustomerIdOf(auth);
  const now = new Date();
  return transaction(async () => {
    const { resource, venue, slot } = await quoteFor(auth, input, now);
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
    eventsService.publish(auth, "booking.changed", booking);
    if (expiresAt)
      await expireBookingJob.queue(
        { tenantId: auth.tenantId, bookingId: booking.id },
        { startAfter: expiresAt },
      );
    return replyOf(booking, await detailsOfOne(auth, booking), venue);
  });
}

/**
 * BKG-04: staff book for someone at the desk or on the phone. Confirmed straight away, with no
 * Advance and no expiry; a cash walk-in pays the full price in the same transaction.
 */
async function createWalkIn(auth: AuthContext, input: CreateBooking, walkIn: WalkIn) {
  if (isCustomerSide(auth)) throw httpErrors.notAllowed();
  return transaction(async () => {
    const { resource, venue, slot } = await quoteFor(auth, input, new Date());
    const customer = await customersService.findOrCreateByPhone(
      auth,
      walkIn.customerPhone,
      walkIn.customerName,
    );
    const booking = await bookingsRepository.insert(auth.tenantId, {
      venueId: venue.id,
      resourceId: resource.id,
      customerId: customer.id,
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
    if (walkIn.payment === "CASH") await bookingPaymentsService.recordWalkInCash(auth, booking);
    return replyOf(booking, await detailsOfOne(auth, booking));
  });
}

/**
 * PAY-02: a Transfer Receipt arrived, so the booking waits for a Receipt Check instead of expiring.
 * Called by payments inside the transaction that saves the receipt, after locking the booking.
 */
export async function receiptSent(auth: AuthContext, id: number) {
  const booking = await bookingsRepository.setStatus(
    auth.tenantId,
    id,
    "AWAITING_PAYMENT",
    "AWAITING_CHECK",
  );
  if (!booking) throw statusChangedMeanwhile();
  eventsService.publish(auth, "booking.changed", booking);
}

/**
 * PAY-04: an accepted receipt confirms the booking; one cancelled meanwhile stays cancelled.
 * Called by payments inside the transaction that saves the Receipt Check.
 */
export async function receiptAccepted(auth: AuthContext, id: number) {
  const confirmed = await bookingsRepository.setStatus(
    auth.tenantId,
    id,
    "AWAITING_CHECK",
    "CONFIRMED",
  );
  if (!confirmed) return;
  eventsService.publish(auth, "booking.changed", confirmed);
  await tellCustomer(auth, confirmed, WHATSAPP_TEMPLATES.bookingConfirmed);
}

/**
 * PAY-05: a rejected receipt reopens the booking with a fresh Payment Time Limit, or cancels it if
 * the customer already has another booking waiting for payment (D-07). Called like receiptAccepted.
 */
export async function receiptRejected(auth: AuthContext, id: number, reason: string) {
  const booking = await bookingsRepository.findById(auth.tenantId, id, scopeOf(auth));
  if (booking?.status !== "AWAITING_CHECK") return;
  if (await bookingsRepository.hasOtherAwaitingPayment(auth.tenantId, booking.customerId, id)) {
    const cancelled = await bookingsRepository.setStatus(
      auth.tenantId,
      id,
      "AWAITING_CHECK",
      "CANCELLED",
      { cancelReason: reason },
    );
    if (!cancelled) throw statusChangedMeanwhile();
    eventsService.publish(auth, "booking.changed", cancelled);
    await tellCustomer(auth, cancelled, WHATSAPP_TEMPLATES.bookingCancelled, [reason]);
    return;
  }
  const venue = await venueOf(auth, booking.venueId);
  const expiresAt = new Date(Date.now() + venue.paymentTimeLimitMinutes * MS_PER_MINUTE);
  const reopened = await bookingsRepository.setStatus(
    auth.tenantId,
    id,
    "AWAITING_CHECK",
    "AWAITING_PAYMENT",
    { expiresAt },
  );
  if (!reopened) throw statusChangedMeanwhile();
  eventsService.publish(auth, "booking.changed", reopened);
  await expireBookingJob.queue(
    { tenantId: auth.tenantId, bookingId: id },
    { startAfter: expiresAt },
  );
  await tellCustomer(auth, reopened, WHATSAPP_TEMPLATES.receiptRejected, [
    reason,
    describeInstant(expiresAt, venue.timeZone),
  ]);
}

const isPastCancellationCutOff = (booking: StoredBooking, now: Date) =>
  booking.startsAt.getTime() - now.getTime() <= booking.cancellationCutOffHours * MS_PER_HOUR;

/** A WhatsApp message about the booking: its venue, resource and start time, then `more`. */
export async function tellCustomer(
  auth: AuthContext,
  booking: StoredBooking,
  template: WhatsAppTemplate,
  more: string[] = [],
) {
  const system: AuthContext = { actor: "system", tenantId: auth.tenantId };
  const [venue, resource] = await Promise.all([
    venuesService.get(system, booking.venueId),
    resourcesService.get(system, booking.resourceId),
  ]);
  await notificationsService.notifyCustomer(auth, {
    customerId: booking.customerId,
    template,
    values: [venue.name, resource.name, describeInstant(booking.startsAt, venue.timeZone), ...more],
  });
}

/**
 * BKG-06, BKG-07: cancelling frees the slots. Customers and the Assistant may cancel a confirmed
 * booking only before its Cancellation Cut-off; staff cancel any booking, with a reason.
 */
export async function update(auth: AuthContext, id: number, input: UpdateBooking) {
  const booking = await bookingsRepository.findById(auth.tenantId, id, scopeOf(auth));
  if (!booking) throw bookingErrors.notFound(id);
  bookingTransitions.check(auth.actor, booking.status, input.status);
  const cancelReason = input.cancelReason ?? null;
  if (auth.actor === "staff" && !cancelReason) throw bookingErrors.cancelReasonMissing();
  if (
    isCustomerSide(auth) &&
    booking.status === "CONFIRMED" &&
    isPastCancellationCutOff(booking, new Date())
  ) {
    const venue = await venueOf(auth, booking.venueId);
    throw bookingErrors.pastCancellationCutOff(venue.name, venue.phone);
  }
  return transaction(async () => {
    const cancelled = await bookingsRepository.setStatus(
      auth.tenantId,
      id,
      booking.status,
      input.status,
      { cancelReason },
    );
    if (!cancelled) throw statusChangedMeanwhile();
    eventsService.publish(auth, "booking.changed", cancelled);
    if (auth.actor === "staff" && cancelReason)
      await tellCustomer(auth, cancelled, WHATSAPP_TEMPLATES.bookingCancelled, [cancelReason]);
    return replyOf(cancelled, await detailsOfOne(auth, cancelled));
  });
}
