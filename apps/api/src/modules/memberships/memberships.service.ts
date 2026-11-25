import {
  type CreateMembership,
  type Membership,
  type MembershipFilters,
  type MembershipPlan,
  membershipLastDay,
  type UpdateMembership,
  type WalkIn,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { type ListQuery, statusChangedMeanwhile } from "../../lib/resource";
import { addDays, describeDate, describeInstant, todayIn } from "../../lib/time";
import { WHATSAPP_TEMPLATES, type WhatsAppTemplate } from "../../ports/messaging-channel";
import * as customersService from "../customers/customers.service";
import * as eventsService from "../notifications/events.service";
import * as notificationsService from "../notifications/notifications.service";
import * as recordedPaymentsService from "../payments/recorded-payments.service";
import * as venuesService from "../venues/venues.service";
import * as membershipPlansService from "./membership-plans.service";
import { membershipErrors } from "./memberships.errors";
import { expireMembershipJob } from "./memberships.jobs";
import * as membershipsRepository from "./memberships.repository";
import { membershipTransitions } from "./memberships.transitions";

type MembershipSort = "startsOn" | "createdAt";
type StoredMembership = Omit<
  Membership,
  "bankAccount" | "customerName" | "customerPhone" | "paid" | "balance"
>;
type Details = { contact: { name: string; phone: string }; paidCents: number };
type Venue = Awaited<ReturnType<typeof venuesService.get>>;

const MS_PER_MINUTE = 60 * 1000;

const isCustomerSide = (auth: AuthContext) =>
  auth.actor === "customer" || auth.actor === "assistant";

const scopeOf = (auth: AuthContext): membershipsRepository.MembershipScope =>
  isCustomerSide(auth)
    ? { venueIds: undefined, ownCustomerId: auth.customerId ?? null }
    : { venueIds: auth.venueIds };

const systemOf = (auth: AuthContext): AuthContext => ({ actor: "system", tenantId: auth.tenantId });

/** Read as the system, which also sees turned-off venues, so a waiting membership still shows where to pay. */
const venueOf = (auth: AuthContext, venueId: number) => venuesService.get(systemOf(auth), venueId);

const waitsForPayment = (membership: StoredMembership) => membership.status === "AWAITING_PAYMENT";
const owesNothing = (membership: StoredMembership) =>
  membership.status === "EXPIRED" || membership.status === "CANCELLED";

function replyOf(
  membership: StoredMembership,
  { contact, paidCents }: Details,
  venue?: Venue,
): Membership {
  const { currency } = membership.price;
  const balanceCents = owesNothing(membership) ? 0 : membership.price.amount - paidCents;
  return {
    ...membership,
    customerName: contact.name,
    customerPhone: contact.phone,
    paid: { amount: paidCents, currency },
    balance: { amount: balanceCents, currency },
    bankAccount: waitsForPayment(membership) ? (venue?.bankAccount ?? null) : null,
  };
}

async function detailsOf(auth: AuthContext, memberships: StoredMembership[]) {
  const contacts = await customersService.contactsOf(
    auth.tenantId,
    memberships.map((membership) => membership.customerId),
  );
  const paidFor = await recordedPaymentsService.paidForMemberships(
    auth,
    memberships.map((membership) => membership.id),
  );
  return (membership: StoredMembership): Details => ({
    contact: contacts.get(membership.customerId)!,
    paidCents: paidFor(membership.id),
  });
}

const detailsOfOne = async (auth: AuthContext, membership: StoredMembership) =>
  (await detailsOf(auth, [membership]))(membership);

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<MembershipFilters, MembershipSort>,
) {
  const found = await membershipsRepository.list(auth.tenantId, scopeOf(auth), filters, page);
  const details = await detailsOf(auth, found.content);
  const venues = new Map<number, Promise<Venue>>();
  const content = await Promise.all(
    found.content.map(async (membership) => {
      if (!waitsForPayment(membership)) return replyOf(membership, details(membership));
      if (!venues.has(membership.venueId))
        venues.set(membership.venueId, venueOf(auth, membership.venueId));
      return replyOf(membership, details(membership), await venues.get(membership.venueId));
    }),
  );
  return { ...found, content };
}

/** With `lock`, changes to the membership and payments on it wait until this transaction ends. */
export async function get(auth: AuthContext, id: number, lock?: "update") {
  const membership = await membershipsRepository.findById(auth.tenantId, id, scopeOf(auth), lock);
  if (!membership) throw membershipErrors.notFound(id);
  const details = await detailsOfOne(auth, membership);
  if (!waitsForPayment(membership)) return replyOf(membership, details);
  return replyOf(membership, details, await venueOf(auth, membership.venueId));
}

/** MEM-01: a plan that was turned off can't be bought or sold any more. */
async function planOnSale(auth: AuthContext, planId: number) {
  const plan = await membershipPlansService.get(auth, planId);
  if (!plan.active) throw membershipErrors.planNotOnSale();
  return { plan, venue: await venuesService.get(auth, plan.venueId) };
}

const lastDayFor = (startsOn: string, plan: MembershipPlan) =>
  membershipLastDay(startsOn, plan.lengthCount, plan.lengthUnit);

/**
 * MEM-02: today or a later start, and the plan's length from there. MEM-04: with an active
 * membership of the same plan, the new one starts the day after it ends, so there's no gap.
 */
async function daysFor(
  auth: AuthContext,
  plan: MembershipPlan,
  venue: Venue,
  customerId: number,
  asked: string | undefined,
) {
  const today = todayIn(venue.timeZone);
  if (asked !== undefined && asked < today) throw membershipErrors.startsInThePast();
  const lastDay = await membershipsRepository.lastActiveDay(
    auth.tenantId,
    customerId,
    plan.id,
    today,
  );
  const earliest = lastDay === undefined ? today : addDays(lastDay, 1);
  const startsOn = asked !== undefined && asked > earliest ? asked : earliest;
  return { startsOn, endsOn: lastDayFor(startsOn, plan) };
}

function ownCustomerIdOf(auth: AuthContext): number {
  if (!isCustomerSide(auth)) throw membershipErrors.walkInMissing();
  if (auth.customerId === undefined) throw membershipErrors.noCustomerRecord();
  return auth.customerId;
}

/** MEM-02: bought online, it waits for a Transfer Receipt for the venue's Payment Time Limit. */
export async function create(auth: AuthContext, input: CreateMembership) {
  if (input.walkIn) return sell(auth, input, input.walkIn);
  const customerId = ownCustomerIdOf(auth);
  return transaction(async () => {
    const { plan, venue } = await planOnSale(auth, input.planId);
    if (venue.payAtVenue) throw membershipErrors.soldAtTheDesk(venue.name);
    const days = await daysFor(auth, plan, venue, customerId, input.startsOn);
    const expiresAt = new Date(Date.now() + venue.paymentTimeLimitMinutes * MS_PER_MINUTE);
    const membership = await membershipsRepository.insert(auth.tenantId, {
      ...days,
      venueId: venue.id,
      planId: plan.id,
      customerId,
      status: "AWAITING_PAYMENT",
      priceAmount: plan.price.amount,
      priceCurrency: plan.price.currency,
      amountDue: plan.price.amount,
      expiresAt,
      createdBy: auth.userId ?? null,
    });
    eventsService.publish(auth, "membership.changed", membership);
    await expireMembershipJob.queue(
      { tenantId: auth.tenantId, membershipId: membership.id },
      { startAfter: expiresAt },
    );
    return replyOf(membership, await detailsOfOne(auth, membership), venue);
  });
}

/** MEM-03: sold at the desk, it's active straight away; paid in cash now, or later. */
async function sell(auth: AuthContext, input: CreateMembership, walkIn: WalkIn) {
  if (isCustomerSide(auth)) throw httpErrors.notAllowed();
  return transaction(async () => {
    const { plan, venue } = await planOnSale(auth, input.planId);
    const customer = await customersService.findOrCreateByPhone(
      auth,
      walkIn.customerPhone,
      walkIn.customerName,
    );
    const days = await daysFor(auth, plan, venue, customer.id, input.startsOn);
    const membership = await membershipsRepository.insert(auth.tenantId, {
      ...days,
      venueId: venue.id,
      planId: plan.id,
      customerId: customer.id,
      status: "ACTIVE",
      priceAmount: plan.price.amount,
      priceCurrency: plan.price.currency,
      amountDue: 0,
      expiresAt: null,
      createdBy: auth.userId ?? null,
    });
    eventsService.publish(auth, "membership.changed", membership);
    if (walkIn.payment === "CASH")
      await recordedPaymentsService.recordWalkInCash(
        auth,
        { membershipId: membership.id },
        membership,
      );
    await tellActive(auth, membership);
    return replyOf(membership, await detailsOfOne(auth, membership));
  });
}

/** A WhatsApp message about the membership: its venue, plan and start date, then `more`. */
export async function tellCustomer(
  auth: AuthContext,
  membership: StoredMembership,
  template: WhatsAppTemplate,
  more: string[] = [],
) {
  const venue = await venueOf(auth, membership.venueId);
  await notificationsService.notifyCustomer(auth, {
    customerId: membership.customerId,
    template,
    values: [venue.name, membership.planName, describeDate(membership.startsOn), ...more],
  });
}

const tellActive = (auth: AuthContext, membership: StoredMembership) =>
  tellCustomer(auth, membership, WHATSAPP_TEMPLATES.membershipActive, [
    describeDate(membership.endsOn),
  ]);

/** PAY-02: a Transfer Receipt arrived. Called by payments after locking the membership. */
export async function receiptSent(auth: AuthContext, id: number) {
  const membership = await membershipsRepository.setStatus(
    auth.tenantId,
    id,
    "AWAITING_PAYMENT",
    "AWAITING_CHECK",
  );
  if (!membership) throw statusChangedMeanwhile();
  eventsService.publish(auth, "membership.changed", membership);
}

/** PAY-04: an accepted receipt makes the membership active; one cancelled meanwhile stays so. */
export async function receiptAccepted(auth: AuthContext, id: number) {
  const active = await membershipsRepository.setStatus(
    auth.tenantId,
    id,
    "AWAITING_CHECK",
    "ACTIVE",
  );
  if (!active) return;
  eventsService.publish(auth, "membership.changed", active);
  await tellActive(auth, active);
}

/**
 * PAY-05: a rejected receipt reopens the membership with a fresh Payment Time Limit. Unlike
 * bookings, a customer may have several memberships waiting for payment (D-07).
 */
export async function receiptRejected(auth: AuthContext, id: number, reason: string) {
  const membership = await membershipsRepository.findById(auth.tenantId, id, scopeOf(auth));
  if (membership?.status !== "AWAITING_CHECK") return;
  const venue = await venueOf(auth, membership.venueId);
  const expiresAt = new Date(Date.now() + venue.paymentTimeLimitMinutes * MS_PER_MINUTE);
  const reopened = await membershipsRepository.setStatus(
    auth.tenantId,
    id,
    "AWAITING_CHECK",
    "AWAITING_PAYMENT",
    { expiresAt },
  );
  if (!reopened) throw statusChangedMeanwhile();
  eventsService.publish(auth, "membership.changed", reopened);
  await expireMembershipJob.queue(
    { tenantId: auth.tenantId, membershipId: id },
    { startAfter: expiresAt },
  );
  await tellCustomer(auth, reopened, WHATSAPP_TEMPLATES.membershipReceiptRejected, [
    reason,
    describeInstant(expiresAt, venue.timeZone),
  ]);
}

/** Customers and the Assistant cancel their own unpaid membership; staff cancel any, with a reason. */
export async function update(auth: AuthContext, id: number, input: UpdateMembership) {
  const membership = await membershipsRepository.findById(auth.tenantId, id, scopeOf(auth));
  if (!membership) throw membershipErrors.notFound(id);
  membershipTransitions.check(auth.actor, membership.status, input.status);
  const cancelReason = input.cancelReason ?? null;
  if (auth.actor === "staff" && !cancelReason) throw membershipErrors.cancelReasonMissing();
  return transaction(async () => {
    const cancelled = await membershipsRepository.setStatus(
      auth.tenantId,
      id,
      membership.status,
      input.status,
      { cancelReason },
    );
    if (!cancelled) throw statusChangedMeanwhile();
    eventsService.publish(auth, "membership.changed", cancelled);
    if (auth.actor === "staff" && cancelReason)
      await tellCustomer(auth, cancelled, WHATSAPP_TEMPLATES.membershipCancelled, [cancelReason]);
    return replyOf(cancelled, await detailsOfOne(auth, cancelled));
  });
}
