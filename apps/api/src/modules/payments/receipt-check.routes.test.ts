import { beforeAll, describe, expect, it } from "bun:test";

import { sql } from "drizzle-orm";

import { db, pool } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import { WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  queuedMessagesFor,
  resourceInput,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";
import * as bookingExpiryService from "../bookings/booking-expiry.service";
import * as paymentsService from "./payments.service";

const TIME_ZONE = "Asia/Colombo";
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60 * 1000;
const FIRST_HOUR = 6;
const PRICE_RUPEES = 3_000;
const PAYMENT_TIME_LIMIT_MINUTES = 45;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });

type As = Parameters<typeof call>[2];

const LOCK_POLL_MS = 5;
const LOCK_POLL_LIMIT = 400;

/**
 * Holds the booking's row lock while `start` runs, and lets go once `waiters` calls queue behind
 * it, so all have read the payment first. Polls on another connection: a transaction's view is frozen.
 */
async function withBookingLocked<T>(bookingId: number, waiters: number, start: () => Promise<T>) {
  const holder = await pool.connect();
  try {
    await holder.query("begin");
    await holder.query("select 1 from bookings where id = $1 for update", [bookingId]);
    const running = start();
    for (let poll = 0; ; poll++) {
      const { rows } = await pool.query(
        "select count(*)::int as waiting from pg_stat_activity where wait_event_type = 'Lock' and datname = current_database()",
      );
      if (rows[0].waiting >= waiters) break;
      if (poll === LOCK_POLL_LIMIT) throw new Error(`Only ${rows[0].waiting} calls queued`);
      await Bun.sleep(LOCK_POLL_MS);
    }
    await holder.query("commit");
    return await running;
  } finally {
    holder.release();
  }
}

describe("PAY-04, PAY-05 accept or reject a receipt", () => {
  let tenant: TestTenant;
  let resourceId: number;
  let nextHour = FIRST_HOUR;
  const asFrontDesk = () => asStaff(tenant, tenant.frontDesk);
  const asManager = () => asStaff(tenant, tenant.manager);

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenant),
        venueInput({
          openingHours: openAllWeek,
          paymentTimeLimitMinutes: PAYMENT_TIME_LIMIT_MINUTES,
        }),
      )
    ).body.data;
    resourceId = (
      await call(
        "POST",
        "/v1/resources",
        asStaff(tenant),
        resourceInput(venue.id, { price: rupees(PRICE_RUPEES) }),
      )
    ).body.data.id;
  });

  async function newCustomer() {
    const phone = uniquePhone();
    const reply = await call("POST", "/v1/customers", asCustomer(tenant, phone), {
      name: "Nimal",
      phone,
    });
    return { phone, id: reply.body.data.id as number };
  }

  /** An online booking waiting for payment, an hour later than the last one. */
  async function newBooking(phone: string) {
    const startsAt = instantAt(
      addDays(todayIn(TIME_ZONE), 2),
      nextHour++ * MINUTES_PER_HOUR,
      TIME_ZONE,
    );
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startsAt.toISOString(),
    });
    expect(reply.body.data.status).toBe("AWAITING_PAYMENT");
    return reply.body.data as { id: number; expiresAt: string };
  }

  async function sendReceipt(phone: string, bookingId: number) {
    const as = asCustomer(tenant, phone);
    const file = await call("POST", "/v1/files", as, uploadForm(imageBytes(), "RECEIPT"));
    const reply = await call("POST", "/v1/payments", as, {
      kind: "TRANSFER",
      bookingId,
      fileId: file.body.data.id,
    });
    expect(reply.status).toBe(201);
    return reply.body.data.id as number;
  }

  /** A customer whose booking waits for a Receipt Check. */
  async function waitingForCheck() {
    const customer = await newCustomer();
    const booking = await newBooking(customer.phone);
    const paymentId = await sendReceipt(customer.phone, booking.id);
    return { customer, booking, paymentId };
  }

  const check = (as: As, paymentId: number, body: object) =>
    call("PATCH", `/v1/payments/${paymentId}`, as, body);
  const accept = (as: As, paymentId: number) => check(as, paymentId, { status: "ACCEPTED" });
  const reject = (as: As, paymentId: number, rejectReason = "The amount is wrong") =>
    check(as, paymentId, { status: "REJECTED", rejectReason });

  const bookingOf = async (bookingId: number) =>
    (await call("GET", `/v1/bookings/${bookingId}`, asStaff(tenant))).body.data;

  const templatesFor = async (customerId: number) =>
    (await queuedMessagesFor(customerId)).map((message) => message.template);

  const expireJobsFor = async (bookingId: number) => {
    const { rows } = await db().execute(
      sql`select start_after from pgboss.job where name = 'expire-booking' and (data->>'bookingId')::int = ${bookingId}`,
    );
    return rows.map((row) => new Date(row.start_after as string).getTime());
  };

  it("accept_confirmsTheBooking_andTellsTheCustomer", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();

    const reply = await accept(asFrontDesk(), paymentId);

    expect(reply).toMatchObject({ status: 200, body: { data: { status: "ACCEPTED" } } });
    const confirmed = await bookingOf(booking.id);
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.paid).toEqual(confirmed.amountDue);
    expect(await queuedMessagesFor(customer.id)).toEqual([
      {
        tenantId: tenant.id,
        customerId: customer.id,
        template: WHATSAPP_TEMPLATES.bookingConfirmed,
        values: [expect.any(String), expect.any(String), expect.any(String)],
      },
    ]);
  });

  it("reject_reopensTheBookingWithAFreshTimeLimit_andTellsTheReason", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();
    const before = Date.now();

    const reply = await reject(asManager(), paymentId, "The amount is wrong");

    expect(reply.body.data).toMatchObject({
      status: "REJECTED",
      rejectReason: "The amount is wrong",
    });
    const reopened = await bookingOf(booking.id);
    expect(reopened).toMatchObject({ status: "AWAITING_PAYMENT", paid: rupees(0) });
    const expiresAt = new Date(reopened.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + PAYMENT_TIME_LIMIT_MINUTES * MS_PER_MINUTE);
    expect(await expireJobsFor(booking.id)).toContain(expiresAt);
    const [message] = await queuedMessagesFor(customer.id);
    expect(message).toMatchObject({
      template: WHATSAPP_TEMPLATES.receiptRejected,
      values: [
        expect.any(String),
        expect.any(String),
        expect.any(String),
        "The amount is wrong",
        expect.any(String),
      ],
    });
  });

  it("reject_thenTheOldExpiryJobDoesNothing_andANewReceiptCanBeSent", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();
    await reject(asFrontDesk(), paymentId);

    await bookingExpiryService.expire(tenant.id, booking.id);

    expect((await bookingOf(booking.id)).status).toBe("AWAITING_PAYMENT");
    expect(await templatesFor(customer.id)).not.toContain(WHATSAPP_TEMPLATES.bookingExpired);
    await sendReceipt(customer.phone, booking.id);
    expect((await bookingOf(booking.id)).status).toBe("AWAITING_CHECK");
  });

  it("reject_withoutAReason_isRefused", async () => {
    const { booking, paymentId } = await waitingForCheck();

    const reply = await check(asFrontDesk(), paymentId, { status: "REJECTED" });

    expect(reply).toMatchObject({ status: 400, body: { code: "tt_pay_012" } });
    expect((await bookingOf(booking.id)).status).toBe("AWAITING_CHECK");
  });

  it("reject_whenTheCustomerHasAnotherBookingWaitingForPayment_cancelsTheBooking", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();
    const other = await newBooking(customer.phone);

    const reply = await reject(asFrontDesk(), paymentId, "Wrong receipt");

    expect(reply.body.data.status).toBe("REJECTED");
    expect(await bookingOf(booking.id)).toMatchObject({
      status: "CANCELLED",
      cancelReason: "Wrong receipt",
    });
    expect((await bookingOf(other.id)).status).toBe("AWAITING_PAYMENT");
    const [message] = await queuedMessagesFor(customer.id);
    expect(message).toMatchObject({
      template: WHATSAPP_TEMPLATES.bookingCancelled,
      values: [expect.any(String), expect.any(String), expect.any(String), "Wrong receipt"],
    });
  });

  it("accept_onABookingCancelledMeanwhile_acceptsOnlyThePayment", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();
    await call("PATCH", `/v1/bookings/${booking.id}`, asManager(), {
      status: "CANCELLED",
      cancelReason: "Pitch flooded",
    });

    const reply = await accept(asFrontDesk(), paymentId);

    expect(reply.body.data.status).toBe("ACCEPTED");
    const cancelled = await bookingOf(booking.id);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.paid).toEqual(cancelled.amountDue);
    expect(await templatesFor(customer.id)).toEqual([WHATSAPP_TEMPLATES.bookingCancelled]);
  });

  it("reject_onABookingCancelledMeanwhile_rejectsOnlyThePayment", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();
    await call("PATCH", `/v1/bookings/${booking.id}`, asManager(), {
      status: "CANCELLED",
      cancelReason: "Pitch flooded",
    });

    const reply = await reject(asFrontDesk(), paymentId);

    expect(reply.body.data.status).toBe("REJECTED");
    expect((await bookingOf(booking.id)).status).toBe("CANCELLED");
    expect(await templatesFor(customer.id)).toEqual([WHATSAPP_TEMPLATES.bookingCancelled]);
  });

  it("check_byTwoStaffAtOnce_oneIsToldItChangedMeanwhile", async () => {
    const { booking, paymentId } = await waitingForCheck();

    const results = await withBookingLocked(booking.id, 2, () =>
      Promise.allSettled([
        paymentsService.update(tenant.frontDesk.auth, paymentId, { status: "ACCEPTED" }),
        paymentsService.update(tenant.manager.auth, paymentId, {
          status: "REJECTED",
          rejectReason: "The amount is wrong",
        }),
      ]),
    );

    const won = results.find((result) => result.status === "fulfilled");
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "tt_sts_002" },
    });
    const expected = won?.value.status === "ACCEPTED" ? "CONFIRMED" : "AWAITING_PAYMENT";
    expect((await bookingOf(booking.id)).status).toBe(expected);
  });

  it("check_twice_isRefused", async () => {
    const { paymentId } = await waitingForCheck();
    await accept(asFrontDesk(), paymentId);

    const reply = await reject(asFrontDesk(), paymentId);

    expect(reply).toMatchObject({ status: 409, body: { code: "tt_sts_001" } });
  });

  it("check_byTheCustomerOrTheAssistant_isRefused", async () => {
    const { customer, booking, paymentId } = await waitingForCheck();

    for (const as of [asCustomer(tenant, customer.phone), asAssistant(tenant, customer.phone)]) {
      const reply = await accept(as, paymentId);
      expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
    }
    expect((await bookingOf(booking.id)).status).toBe("AWAITING_CHECK");
  });

  it("check_ofAPaymentThatDoesNotExist_isNotFound", async () => {
    const reply = await accept(asFrontDesk(), Number.MAX_SAFE_INTEGER);
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });
});
