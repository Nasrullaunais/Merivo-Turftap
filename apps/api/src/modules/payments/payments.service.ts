import type {
  BookingStatus,
  CreatePayment,
  MembershipStatus,
  Money,
  PaymentFilters,
  RecordPayment,
  SendTransferReceipt,
  UpdatePayment,
} from "@turftap/contract";
import { REFUND_ROLES } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { type ListQuery, statusChangedMeanwhile } from "../../lib/resource";
import * as bookingsService from "../bookings/bookings.service";
import * as filesService from "../files/files.service";
import * as membershipsService from "../memberships/memberships.service";
import * as eventsService from "../notifications/events.service";
import { paymentErrors } from "./payments.errors";
import { readReceiptJob } from "./payments.jobs";
import * as paymentsRepository from "./payments.repository";
import { paymentTransitions } from "./payments.transitions";
import type { PaidFor } from "./recorded-payments.service";

type PaymentSort = "createdAt";
type StoredPayment = Awaited<ReturnType<typeof paymentsRepository.insert>>;

/** The booking or membership a payment is for, with the money fields both have. */
type Payable = {
  what: "booking" | "membership";
  paidFor: PaidFor;
  id: number;
  venueId: number;
  status: BookingStatus | MembershipStatus;
  price: Money;
  amountDue: Money;
  paid: Money;
  balance: Money;
  expiresAt: Date | null;
};

/** Locked, so payments saved at the same time on the same thing wait for each other. */
async function payableOf(
  auth: AuthContext,
  input: { bookingId?: number; membershipId?: number },
): Promise<Payable> {
  if (input.bookingId !== undefined) {
    const booking = await bookingsService.get(auth, input.bookingId, "update");
    return { ...booking, what: "booking", paidFor: { bookingId: booking.id } };
  }
  const membership = await membershipsService.get(auth, input.membershipId!, "update");
  return { ...membership, what: "membership", paidFor: { membershipId: membership.id } };
}

/** A confirmed booking, or a membership that is or was in use. */
const isInUse = ({ status }: Payable) =>
  status === "CONFIRMED" || status === "ACTIVE" || status === "ENDED";

const isCustomerSide = (auth: AuthContext) =>
  auth.actor === "customer" || auth.actor === "assistant";

/** Whoever may see a payment sees its Receipt Reading and opens its receipt through a fresh link. */
async function withReceipts(auth: AuthContext, payments: StoredPayment[]) {
  const fileIds = payments.flatMap(({ fileId }) => (fileId === null ? [] : [fileId]));
  const [urls, readings] = await Promise.all([
    filesService.receiptUrls(auth, fileIds),
    paymentsRepository.readingsOf(
      auth.tenantId,
      payments.map(({ id }) => id),
    ),
  ]);
  return payments.map(({ fileId, ...payment }) => ({
    ...payment,
    receiptUrl: fileId === null ? null : (urls.get(fileId) ?? null),
    receiptReading: readings.get(payment.id) ?? null,
  }));
}

export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<PaymentFilters, PaymentSort>,
) {
  const found = await paymentsRepository.list(auth.tenantId, auth.venueIds, filters, page);
  return { ...found, content: await withReceipts(auth, found.content) };
}

export async function get(auth: AuthContext, id: number) {
  const payment = await paymentsRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!payment) throw paymentErrors.notFound(id);
  const [withUrl] = await withReceipts(auth, [payment]);
  return withUrl!;
}

/** PAY-08: cash pays some or all of the balance of a confirmed booking or active membership. */
function checkCash(payable: Payable, cents: number) {
  if (!isInUse(payable)) throw paymentErrors.cashNeedsConfirmed();
  if (payable.balance.amount <= 0) throw paymentErrors.alreadyFullyPaid(payable.what);
  if (cents > payable.balance.amount) throw paymentErrors.moreThanBalance(payable.what);
}

/** BKG-08: a refund on a cancelled booking or membership, up to what was paid for it. */
function checkRefund(payable: Payable, cents: number) {
  if (payable.status !== "CANCELLED") throw paymentErrors.refundNeedsCancelled(payable.what);
  if (cents > payable.paid.amount) throw paymentErrors.refundMoreThanPaid(payable.what);
}

export async function create(auth: AuthContext, input: CreatePayment) {
  if (input.kind === "TRANSFER") return sendTransferReceipt(auth, input);
  if (isCustomerSide(auth)) throw httpErrors.notAllowed();
  return record(auth, input);
}

/** PAY-02: only something still waiting for payment, inside its Payment Time Limit, takes a receipt. */
function checkWaitsForPayment({ what, status, expiresAt }: Payable, now: Date) {
  const pastTimeLimit = expiresAt !== null && expiresAt <= now;
  if (status === "EXPIRED" || (status === "AWAITING_PAYMENT" && pastTimeLimit))
    throw paymentErrors.paymentTimeLimitPassed(what);
  if (status !== "AWAITING_PAYMENT") throw paymentErrors.notWaitingForPayment(what);
}

const receiptSent = (auth: AuthContext, { paidFor }: Payable) =>
  "bookingId" in paidFor
    ? bookingsService.receiptSent(auth, paidFor.bookingId)
    : membershipsService.receiptSent(auth, paidFor.membershipId);

/**
 * PAY-02: the receipt pays the amount due and waits for a Receipt Check, and the AI reads it soon
 * after. The booking or membership stays locked until its status changes, so expiry finds nothing.
 */
function sendTransferReceipt(auth: AuthContext, input: SendTransferReceipt) {
  return transaction(async () => {
    const payable = await payableOf(auth, input);
    checkWaitsForPayment(payable, new Date());
    const file = await filesService.receipt(auth, input.fileId);
    const payment = await paymentsRepository.insert(auth.tenantId, {
      ...payable.paidFor,
      venueId: payable.venueId,
      kind: "TRANSFER",
      status: "PENDING_CHECK",
      amount: payable.amountDue.amount,
      currency: payable.amountDue.currency,
      note: null,
      fileId: file.id,
      createdBy: auth.userId ?? null,
    });
    eventsService.publish(auth, "payment.changed", payment);
    await receiptSent(auth, payable);
    await readReceiptJob.queue({ tenantId: auth.tenantId, paymentId: payment.id });
    const [withUrl] = await withReceipts(auth, [payment]);
    return withUrl!;
  });
}

/**
 * Cash and refunds are accepted straight away. The booking or membership stays locked from the
 * checks to the insert, so two payments recorded at once can't both fit in the same balance.
 */
async function record(auth: AuthContext, input: RecordPayment) {
  if (input.kind === "REFUND" && !(auth.role && REFUND_ROLES.includes(auth.role)))
    throw paymentErrors.refundNeedsManager();
  return transaction(async () => {
    const payable = await payableOf(auth, input);
    const { amount: cents, currency } = input.amount;
    if (currency !== payable.price.currency) throw paymentErrors.wrongCurrency(payable.what);
    if (input.kind === "CASH") checkCash(payable, cents);
    else checkRefund(payable, cents);
    const payment = await paymentsRepository.insert(auth.tenantId, {
      ...payable.paidFor,
      venueId: payable.venueId,
      kind: input.kind,
      status: "ACCEPTED",
      amount: input.kind === "REFUND" ? -cents : cents,
      currency,
      note: input.note,
      createdBy: auth.userId ?? null,
    });
    eventsService.publish(auth, "payment.changed", payment);
    const [withUrl] = await withReceipts(auth, [payment]);
    return withUrl!;
  });
}

/** PAY-04, PAY-05: the Receipt Check. What it paid for moves forward or back in the same transaction. */
export async function update(auth: AuthContext, id: number, input: UpdatePayment) {
  const payment = await paymentsRepository.findById(auth.tenantId, id, auth.venueIds);
  if (!payment) throw paymentErrors.notFound(id);
  paymentTransitions.check(auth.actor, payment.status, input.status);
  const rejectReason = input.status === "REJECTED" ? input.rejectReason : undefined;
  if (input.status === "REJECTED" && rejectReason === undefined)
    throw paymentErrors.rejectReasonMissing();
  return transaction(async () => {
    const checked = await paymentsRepository.setStatus(
      auth.tenantId,
      id,
      payment.status,
      input.status,
      { rejectReason: rejectReason ?? null },
    );
    if (!checked) throw statusChangedMeanwhile();
    eventsService.publish(auth, "payment.changed", checked);
    if (checked.bookingId !== null) {
      if (rejectReason === undefined)
        await bookingsService.receiptAccepted(auth, checked.bookingId);
      else await bookingsService.receiptRejected(auth, checked.bookingId, rejectReason);
    }
    if (checked.membershipId !== null) {
      if (rejectReason === undefined)
        await membershipsService.receiptAccepted(auth, checked.membershipId);
      else await membershipsService.receiptRejected(auth, checked.membershipId, rejectReason);
    }
    const [withUrl] = await withReceipts(auth, [checked]);
    return withUrl!;
  });
}
