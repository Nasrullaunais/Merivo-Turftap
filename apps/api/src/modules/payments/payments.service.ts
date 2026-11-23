import type {
  Booking,
  CreatePayment,
  PaymentFilters,
  RecordPayment,
  SendTransferReceipt,
  StaffRole,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import type { ListQuery } from "../../lib/resource";
import * as bookingsService from "../bookings/bookings.service";
import * as filesService from "../files/files.service";
import { paymentErrors } from "./payments.errors";
import { readReceiptJob } from "./payments.jobs";
import * as paymentsRepository from "./payments.repository";

type PaymentSort = "createdAt";
type StoredPayment = Awaited<ReturnType<typeof paymentsRepository.insert>>;

/** BKG-08: Front Desk takes cash but doesn't record refunds. */
const MAY_REFUND: readonly StaffRole[] = ["OWNER", "MANAGER"];

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

/** PAY-08: cash pays some or all of a confirmed booking's balance. */
function checkCash(booking: Booking, cents: number) {
  if (booking.status !== "CONFIRMED") throw paymentErrors.cashNeedsConfirmedBooking();
  if (booking.balance.amount <= 0) throw paymentErrors.alreadyFullyPaid();
  if (cents > booking.balance.amount) throw paymentErrors.moreThanBalance();
}

/** BKG-08: a refund on a cancelled booking, up to what was paid for it. */
function checkRefund(booking: Booking, cents: number) {
  if (booking.status !== "CANCELLED") throw paymentErrors.refundNeedsCancelledBooking();
  if (cents > booking.paid.amount) throw paymentErrors.refundMoreThanPaid();
}

export async function create(auth: AuthContext, input: CreatePayment) {
  if (input.kind === "TRANSFER") return sendTransferReceipt(auth, input);
  if (isCustomerSide(auth)) throw httpErrors.notAllowed();
  return record(auth, input);
}

/** PAY-02: only a booking still waiting for payment, inside its Payment Time Limit, takes a receipt. */
function checkWaitsForPayment(booking: Booking, now: Date) {
  const pastTimeLimit = booking.expiresAt !== null && booking.expiresAt <= now;
  if (booking.status === "EXPIRED" || (booking.status === "AWAITING_PAYMENT" && pastTimeLimit))
    throw paymentErrors.paymentTimeLimitPassed();
  if (booking.status !== "AWAITING_PAYMENT") throw paymentErrors.notWaitingForPayment();
}

/**
 * PAY-02: the receipt pays the amount due and waits for a Receipt Check, and the AI reads it soon
 * after. The booking stays locked until its status changes, so the expiry job finds nothing to do.
 */
function sendTransferReceipt(auth: AuthContext, { bookingId, fileId }: SendTransferReceipt) {
  return transaction(async () => {
    const booking = await bookingsService.get(auth, bookingId, "update");
    checkWaitsForPayment(booking, new Date());
    const file = await filesService.receipt(auth, fileId);
    const payment = await paymentsRepository.insert(auth.tenantId, {
      venueId: booking.venueId,
      bookingId: booking.id,
      kind: "TRANSFER",
      status: "PENDING_CHECK",
      amount: booking.amountDue.amount,
      currency: booking.amountDue.currency,
      note: null,
      fileId: file.id,
      createdBy: auth.userId ?? null,
    });
    await bookingsService.receiptSent(auth, booking.id);
    await readReceiptJob.queue({ tenantId: auth.tenantId, paymentId: payment.id });
    const [withUrl] = await withReceipts(auth, [payment]);
    return withUrl!;
  });
}

/**
 * Cash and refunds are accepted straight away. The booking stays locked from the checks to the
 * insert, so two payments recorded at once can't both fit in the same balance.
 */
async function record(auth: AuthContext, input: RecordPayment) {
  if (input.kind === "REFUND" && !(auth.role && MAY_REFUND.includes(auth.role)))
    throw paymentErrors.refundNeedsManager();
  return transaction(async () => {
    const booking = await bookingsService.get(auth, input.bookingId, "update");
    const { amount: cents, currency } = input.amount;
    if (currency !== booking.price.currency) throw paymentErrors.wrongCurrency();
    if (input.kind === "CASH") checkCash(booking, cents);
    else checkRefund(booking, cents);
    const payment = await paymentsRepository.insert(auth.tenantId, {
      venueId: booking.venueId,
      bookingId: booking.id,
      kind: input.kind,
      status: "ACCEPTED",
      amount: input.kind === "REFUND" ? -cents : cents,
      currency,
      note: input.note,
      createdBy: auth.userId ?? null,
    });
    const [withUrl] = await withReceipts(auth, [payment]);
    return withUrl!;
  });
}
