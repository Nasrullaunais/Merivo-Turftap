import { afterEach, beforeAll, describe, expect, it } from "bun:test";

import { pool } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  imageBytes,
  limitToVenues,
  openEvents,
  passTimeLimit,
  resourceInput,
  type TestTenant,
  uniquePhone,
  uploadForm,
  venueInput,
} from "../../test/fixtures";
import * as bookingExpiryService from "../bookings/booking-expiry.service";
import * as receiptReadingService from "../payments/receipt-reading.service";

const TIME_ZONE = "Asia/Colombo";
const MINUTES_PER_HOUR = 60;
const FIRST_HOUR = 6;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));

type As = NonNullable<Parameters<typeof call>[2]>;
type Stream = Awaited<ReturnType<typeof openEvents>>;

/** A tenant with two venues, each with one resource, and a fresh hour for every booking. */
async function tenantWithTwoVenues() {
  const tenant = await createTenant();
  const addVenue = async () => {
    const venue = (
      await call("POST", "/v1/venues", asStaff(tenant), venueInput({ openingHours: openAllWeek }))
    ).body.data;
    const resource = (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venue.id)))
      .body.data;
    return { venueId: venue.id as number, resourceId: resource.id as number };
  };
  return { tenant, venueA: await addVenue(), venueB: await addVenue() };
}

let nextHour = FIRST_HOUR;

function walkIn(as: As, resourceId: number, payment: "CASH" | "PAY_LATER" = "PAY_LATER") {
  const startsAt = instantAt(
    addDays(todayIn(TIME_ZONE), 1),
    nextHour++ * MINUTES_PER_HOUR,
    TIME_ZONE,
  );
  return call("POST", "/v1/bookings", as, {
    resourceId,
    startsAt: startsAt.toISOString(),
    walkIn: { customerName: "Kasun", customerPhone: uniquePhone(), payment },
  });
}

describe("BKG-05, PAY-07 live updates", () => {
  let tenant: TestTenant;
  let resourceA: number;
  const open: Stream[] = [];
  const listen = async (as: As) => {
    const stream = await openEvents(as);
    open.push(stream);
    return stream;
  };

  beforeAll(async () => {
    const setup = await tenantWithTwoVenues();
    tenant = setup.tenant;
    resourceA = setup.venueA.resourceId;
  });

  afterEach(async () => {
    await Promise.all(open.splice(0).map((stream) => stream.close()));
  });

  let nextOnlineHour = FIRST_HOUR;

  async function newCustomer() {
    const phone = uniquePhone();
    const as = asCustomer(tenant, phone);
    await call("POST", "/v1/customers", as, { name: "Nimal", phone });
    return as;
  }

  /** An online booking waiting for payment, for a new customer unless one is given. */
  async function bookOnline(customer?: As) {
    const as = customer ?? (await newCustomer());
    const day = addDays(todayIn(TIME_ZONE), 2);
    const startsAt = instantAt(day, nextOnlineHour++ * MINUTES_PER_HOUR, TIME_ZONE);
    const booking = await call("POST", "/v1/bookings", as, { resourceId: resourceA, startsAt });
    return { as, bookingId: booking.body.data.id as number };
  }

  async function sendReceipt(as: As, bookingId: number) {
    const file = await call("POST", "/v1/files", as, uploadForm(imageBytes(), "RECEIPT"));
    const payment = await call("POST", "/v1/payments", as, {
      kind: "TRANSFER",
      bookingId,
      fileId: file.body.data.id,
    });
    return payment.body.data.id as number;
  }

  it("events_sendsBookingChangedAfterABookingIsCreated", async () => {
    const stream = await listen(asStaff(tenant, tenant.frontDesk));
    expect(stream.status).toBe(200);
    expect(stream.response.headers.get("Content-Type")).toBe("text/event-stream");

    const booking = (await walkIn(asStaff(tenant), resourceA)).body.data;

    expect(await stream.next()).toEqual({ type: "booking.changed", id: booking.id });
  });

  it("events_sendsPaymentAndBookingChangesWhenAReceiptArrives", async () => {
    const stream = await listen(asStaff(tenant));

    const { as, bookingId } = await bookOnline();
    const paymentId = await sendReceipt(as, bookingId);

    expect([await stream.next(), await stream.next(), await stream.next()]).toEqual([
      { type: "booking.changed", id: bookingId },
      { type: "payment.changed", id: paymentId },
      { type: "booking.changed", id: bookingId },
    ]);
  });

  it("events_followAReceiptThroughItsReadingAndCheck", async () => {
    const { as, bookingId } = await bookOnline();
    const paymentId = await sendReceipt(as, bookingId);
    const stream = await listen(asStaff(tenant));

    await receiptReadingService.read(tenant.id, paymentId);
    await call("PATCH", `/v1/payments/${paymentId}`, asStaff(tenant), { status: "ACCEPTED" });

    expect([await stream.next(), await stream.next(), await stream.next()]).toEqual([
      { type: "payment.changed", id: paymentId },
      { type: "payment.changed", id: paymentId },
      { type: "booking.changed", id: bookingId },
    ]);
  });

  it("events_sendPaymentAndBookingChangesWhenAReceiptIsRejected", async () => {
    const reopens = await bookOnline();
    const reopensPayment = await sendReceipt(reopens.as, reopens.bookingId);
    const cancels = await bookOnline();
    const cancelsPayment = await sendReceipt(cancels.as, cancels.bookingId);
    await bookOnline(cancels.as);
    const stream = await listen(asStaff(tenant));

    const reject = (paymentId: number) =>
      call("PATCH", `/v1/payments/${paymentId}`, asStaff(tenant), {
        status: "REJECTED",
        rejectReason: "The amount is wrong",
      });
    await reject(reopensPayment);
    await reject(cancelsPayment);

    const events = [];
    for (let count = 0; count < 4; count++) events.push(await stream.next());
    expect(events).toEqual([
      { type: "payment.changed", id: reopensPayment },
      { type: "booking.changed", id: reopens.bookingId },
      { type: "payment.changed", id: cancelsPayment },
      { type: "booking.changed", id: cancels.bookingId },
    ]);
    const cancelled = await call("GET", `/v1/bookings/${cancels.bookingId}`, asStaff(tenant));
    expect(cancelled.body.data.status).toBe("CANCELLED");
  });

  it("events_sendBookingChangedWhenABookingExpiresOrIsCancelled", async () => {
    const { bookingId: unpaid } = await bookOnline();
    const walkInId = (await walkIn(asStaff(tenant), resourceA)).body.data.id;
    const stream = await listen(asStaff(tenant));

    await passTimeLimit(unpaid);
    await bookingExpiryService.expire(tenant.id, unpaid);
    await call("PATCH", `/v1/bookings/${walkInId}`, asStaff(tenant), {
      status: "CANCELLED",
      cancelReason: "Rain",
    });

    expect([await stream.next(), await stream.next()]).toEqual([
      { type: "booking.changed", id: unpaid },
      { type: "booking.changed", id: walkInId },
    ]);
  });

  it("events_sendBookingAndPaymentChangesForAWalkInPaidInCash", async () => {
    const stream = await listen(asStaff(tenant));

    const booking = (await walkIn(asStaff(tenant), resourceA, "CASH")).body.data;
    const payments = await call("GET", `/v1/payments?bookingId=${booking.id}`, asStaff(tenant));

    expect([await stream.next(), await stream.next()]).toEqual([
      { type: "booking.changed", id: booking.id },
      { type: "payment.changed", id: payments.body.data.content[0].id },
    ]);
  });

  it("events_sendPaymentChangedWhenCashIsRecorded", async () => {
    const walkInId = (await walkIn(asStaff(tenant), resourceA)).body.data.id;
    const stream = await listen(asStaff(tenant));

    const cash = await call("POST", "/v1/payments", asStaff(tenant), {
      bookingId: walkInId,
      kind: "CASH",
      amount: { amount: 100_000, currency: "LKR" },
    });

    expect(await stream.next()).toEqual({ type: "payment.changed", id: cash.body.data.id });
  });

  it("events_sendNothingForAChangeThatRolledBack", async () => {
    const stream = await listen(asStaff(tenant));
    const client = await pool.connect();
    try {
      // Makes saving the cash fail after the booking row is written, so the whole walk-in rolls back.
      await client.query(`
        create function fail_payment() returns trigger language plpgsql as $$
        begin raise exception 'payment refused for this test'; end $$;
        create trigger fail_payment before insert on payments
          for each row when (new.tenant_id = ${tenant.id}) execute function fail_payment();`);
      expect((await walkIn(asStaff(tenant), resourceA, "CASH")).status).toBe(500);
    } finally {
      await client.query("drop trigger fail_payment on payments; drop function fail_payment();");
      client.release();
    }

    const saved = (await walkIn(asStaff(tenant), resourceA)).body.data;

    expect(await stream.next()).toEqual({ type: "booking.changed", id: saved.id });
  });

  it("events_refusesCustomersAndCallersWithoutSignIn", async () => {
    const asNimal = asCustomer(tenant, uniquePhone());
    expect(await call("GET", "/v1/events", asNimal)).toMatchObject({ status: 403 });
    expect(await call("GET", "/v1/events", { tenantId: tenant.id })).toMatchObject({ status: 401 });
  });

  it("events_limitedManagerGetsNothingFromAnotherVenue", async () => {
    const { tenant: other, venueA: atA, venueB: atB } = await tenantWithTwoVenues();
    await limitToVenues(other, other.manager, [atA.venueId]);
    const stream = await listen(asStaff(other, other.manager));

    await walkIn(asStaff(other), atB.resourceId);
    const atTheirVenue = (await walkIn(asStaff(other), atA.resourceId)).body.data;

    expect(await stream.next()).toEqual({ type: "booking.changed", id: atTheirVenue.id });
  });

  it("events_tenantBStaffGetNothingFromTenantA", async () => {
    const { tenant: tenantB, venueA: venueOfB } = await tenantWithTwoVenues();
    const stream = await listen(asStaff(tenantB));

    await walkIn(asStaff(tenant), resourceA);
    const ofB = (await walkIn(asStaff(tenantB), venueOfB.resourceId)).body.data;

    expect(await stream.next()).toEqual({ type: "booking.changed", id: ofB.id });
  });
});
