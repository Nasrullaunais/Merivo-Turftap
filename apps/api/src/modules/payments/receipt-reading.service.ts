import type { AuthContext } from "../../lib/auth/context";
import { todayIn, wallClockAt } from "../../lib/time";
import { ports } from "../../ports";
import * as bookingsService from "../bookings/bookings.service";
import * as filesService from "../files/files.service";
import * as eventsService from "../notifications/events.service";
import * as venuesService from "../venues/venues.service";
import * as paymentsRepository from "./payments.repository";

type Match = { id: number };

const tidy = (text: string | null | undefined) => text?.trim() || null;
const referenceKey = (text: string | null | undefined) =>
  text?.replace(/[\s-]/g, "").toUpperCase() || null;

function earliest(...matches: (Match | undefined)[]) {
  return matches
    .filter((match): match is Match => match !== undefined)
    .sort((a, b) => a.id - b.id)[0];
}

/**
 * PAY-03, PAY-06: the AI reads a transfer's receipt once, and the Receipt Reading is saved with
 * its checks. It never changes a status. Kept apart from payments.service, which queues it.
 */
export async function read(tenantId: number, paymentId: number) {
  const auth: AuthContext = { actor: "system", tenantId };
  const payment = await paymentsRepository.findById(tenantId, paymentId, undefined);
  if (!payment?.fileId || !payment.bookingId) return;
  if (await paymentsRepository.hasReading(tenantId, paymentId)) return;

  const stored = await filesService.receiptContent(auth, payment.fileId);
  const reading = stored && (await ports().receiptReader.read(stored));
  const reference = referenceKey(reading?.reference);
  const [booking, venue, sameImage, sameReference] = await Promise.all([
    bookingsService.get(auth, payment.bookingId),
    venuesService.get(auth, payment.venueId),
    filesService
      .sameReceiptImages(auth, payment.fileId)
      .then((fileIds) => paymentsRepository.earliestPaidWithFile(tenantId, fileIds, paymentId)),
    reference === null
      ? undefined
      : paymentsRepository.earliestReadWithReference(tenantId, reference, paymentId),
  ]);
  const madeOn = wallClockAt(booking.createdAt, venue.timeZone).date;
  const paidOn = reading?.paidOn ?? null;
  const amount = reading?.amount ?? null;

  await paymentsRepository.insertReading(tenantId, {
    paymentId,
    unreadable: !reading,
    amount: amount?.amount ?? null,
    currency: amount?.currency ?? null,
    paidOn,
    bank: tidy(reading?.bank),
    reference,
    amountMatches:
      amount === null
        ? null
        : amount.amount === payment.amount.amount && amount.currency === payment.amount.currency,
    dateRecent: paidOn === null ? null : paidOn >= madeOn && paidOn <= todayIn(venue.timeZone),
    referenceNew: reference === null ? null : sameReference === undefined,
    duplicateOf: earliest(sameImage, sameReference)?.id ?? null,
  });
  eventsService.publish(auth, "payment.changed", payment);
}
