import { afterEach, beforeAll, describe, expect, it } from "bun:test";

import { sql } from "drizzle-orm";

import { db } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import type { ReceiptReading } from "../../ports/receipt-reader";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  resourceInput,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";
import { testPorts } from "../../test/ports";
import * as receiptReadingService from "./receipt-reading.service";

const TIME_ZONE = "Asia/Colombo";
const MINUTES_PER_HOUR = 60;
const FIRST_HOUR = 6;
const PRICE_RUPEES = 3_000;
const ADVANCE_PERCENT = 50;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });
const ADVANCE = rupees((PRICE_RUPEES * ADVANCE_PERCENT) / 100);
const defaultAnswer = testPorts.receiptReader.reading;

let receiptsMade = 0;
/** Receipt bytes no other test uploads, so only the tests that mean to send the same image do. */
function uniqueReceiptBytes() {
  const bytes = imageBytes();
  new DataView(bytes.buffer).setUint32(bytes.length - 4, ++receiptsMade);
  return bytes;
}

let referencesMade = 0;
const uniqueReference = () =>
  `REF${++referencesMade}X${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

function answer(reading: Partial<ReceiptReading> = {}) {
  testPorts.receiptReader.reading = {
    amount: ADVANCE,
    paidOn: todayIn(TIME_ZONE),
    bank: "Commercial Bank",
    reference: uniqueReference(),
    ...reading,
  };
  return testPorts.receiptReader.reading;
}

describe("PAY-03, PAY-06 Receipt Reading", () => {
  let tenant: TestTenant;
  let courtA: number;
  let courtB: number;
  let nextHour = FIRST_HOUR;

  async function newResource() {
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenant),
        venueInput({ openingHours: openAllWeek, advancePercent: ADVANCE_PERCENT }),
      )
    ).body.data;
    return (
      await call(
        "POST",
        "/v1/resources",
        asStaff(tenant),
        resourceInput(venue.id, { price: rupees(PRICE_RUPEES) }),
      )
    ).body.data.id as number;
  }

  beforeAll(async () => {
    tenant = await createTenant();
    courtA = await newResource();
    courtB = await newResource();
  });

  afterEach(() => {
    testPorts.receiptReader.reading = defaultAnswer;
  });

  /** A new customer books `resourceId` online and sends a receipt with `bytes`. */
  async function sendReceipt({ resourceId = courtA, bytes = uniqueReceiptBytes() } = {}) {
    const phone = uniquePhone();
    const as = asCustomer(tenant, phone);
    await call("POST", "/v1/customers", as, { name: "Nimal", phone });
    const startsAt = instantAt(
      addDays(todayIn(TIME_ZONE), 2),
      nextHour++ * MINUTES_PER_HOUR,
      TIME_ZONE,
    );
    const booking = await call("POST", "/v1/bookings", as, { resourceId, startsAt });
    const file = await call("POST", "/v1/files", as, uploadForm(bytes, "RECEIPT"));
    const payment = await call("POST", "/v1/payments", as, {
      kind: "TRANSFER",
      bookingId: booking.body.data.id,
      fileId: file.body.data.id,
    });
    expect(payment.status).toBe(201);
    return { paymentId: payment.body.data.id as number, bookingId: booking.body.data.id as number };
  }

  const paymentAsStaff = async (paymentId: number) =>
    (await call("GET", `/v1/payments/${paymentId}`, asStaff(tenant))).body.data;

  async function readAndShow(paymentId: number) {
    await receiptReadingService.read(tenant.id, paymentId);
    return (await paymentAsStaff(paymentId)).receiptReading;
  }

  it("sendTransfer_queuesTheReadReceiptJob", async () => {
    const { paymentId } = await sendReceipt();

    const jobs = await db().execute(
      sql`select data from pgboss.job where name = 'read-receipt' and (data->>'paymentId')::int = ${paymentId}`,
    );

    expect(jobs.rows).toEqual([{ data: { tenantId: tenant.id, paymentId } }]);
  });

  it("beforeTheJobRuns_receiptReadingIsNull", async () => {
    const { paymentId } = await sendReceipt();

    expect((await paymentAsStaff(paymentId)).receiptReading).toBeNull();
  });

  it("read_aMatchingReceipt_passesEveryCheck", async () => {
    const { paymentId } = await sendReceipt();
    const read = answer({ reference: "FT 2611-0042", bank: "  Sampath Bank " });

    expect(await readAndShow(paymentId)).toEqual({
      unreadable: false,
      amount: ADVANCE,
      paidOn: read.paidOn,
      bank: "Sampath Bank",
      reference: "FT26110042",
      amountMatches: true,
      dateRecent: true,
      referenceNew: true,
      duplicateOf: null,
    });
  });

  it("read_theFullPriceWhenTheAdvanceWasDue_doesNotMatch", async () => {
    const { paymentId } = await sendReceipt();
    answer({ amount: rupees(PRICE_RUPEES) });

    expect(await readAndShow(paymentId)).toMatchObject({
      amount: rupees(PRICE_RUPEES),
      amountMatches: false,
    });
  });

  it("read_paidBeforeTheDayTheBookingWasMade_isNotRecent", async () => {
    const { paymentId } = await sendReceipt();
    answer({ paidOn: addDays(todayIn(TIME_ZONE), -1) });

    expect(await readAndShow(paymentId)).toMatchObject({ dateRecent: false });
  });

  it("read_paidInTheFuture_isNotRecent", async () => {
    const { paymentId } = await sendReceipt();
    answer({ paidOn: addDays(todayIn(TIME_ZONE), 1) });

    expect(await readAndShow(paymentId)).toMatchObject({ dateRecent: false });
  });

  it("read_fieldsTheAiCouldNotRead_leaveTheirChecksEmpty", async () => {
    const { paymentId } = await sendReceipt();
    answer({ amount: null, paidOn: null, reference: null });

    expect(await readAndShow(paymentId)).toMatchObject({
      unreadable: false,
      amountMatches: null,
      dateRecent: null,
      referenceNew: null,
      duplicateOf: null,
    });
  });

  it("read_anUnreadableReceipt_saysSo", async () => {
    const { paymentId } = await sendReceipt();
    testPorts.receiptReader.reading = undefined;

    expect(await readAndShow(paymentId)).toEqual({
      unreadable: true,
      amount: null,
      paidOn: null,
      bank: null,
      reference: null,
      amountMatches: null,
      dateRecent: null,
      referenceNew: null,
      duplicateOf: null,
    });
  });

  it("read_theSameImageSentAgain_warnsWithTheEarlierBooking", async () => {
    const bytes = uniqueReceiptBytes();
    const first = await sendReceipt({ bytes });
    const second = await sendReceipt({ bytes });
    answer();
    await receiptReadingService.read(tenant.id, first.paymentId);
    answer();

    expect(await readAndShow(second.paymentId)).toMatchObject({
      referenceNew: true,
      duplicateOf: { paymentId: first.paymentId, bookingId: first.bookingId },
    });
    expect((await paymentAsStaff(first.paymentId)).receiptReading.duplicateOf).toBeNull();
  });

  it("read_theSameReferenceWrittenDifferentlyAtAnotherVenue_warns", async () => {
    const reference = uniqueReference();
    const first = await sendReceipt({ resourceId: courtA });
    answer({ reference: `${reference.slice(0, 3)}-${reference.slice(3)}`.toLowerCase() });
    await receiptReadingService.read(tenant.id, first.paymentId);
    const second = await sendReceipt({ resourceId: courtB });
    answer({ reference: `${reference.slice(0, 3)} ${reference.slice(3)}` });

    expect(await readAndShow(second.paymentId)).toMatchObject({
      referenceNew: false,
      duplicateOf: { paymentId: first.paymentId, bookingId: first.bookingId },
    });
  });

  it("read_twice_keepsTheFirstReading", async () => {
    const { paymentId } = await sendReceipt();
    const first = answer();
    await receiptReadingService.read(tenant.id, paymentId);
    answer();

    expect(await readAndShow(paymentId)).toMatchObject({ reference: first.reference });
  });

  it("list_showsEachPaymentsReading", async () => {
    const { paymentId, bookingId } = await sendReceipt();
    const read = answer();
    await receiptReadingService.read(tenant.id, paymentId);

    const reply = await call("GET", `/v1/payments?bookingId=${bookingId}`, asStaff(tenant));

    expect(reply.body.data.content).toEqual([
      expect.objectContaining({ id: paymentId, receiptReading: expect.objectContaining(read) }),
    ]);
  });
});
