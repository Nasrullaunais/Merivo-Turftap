import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

const TIME_ZONE = "Asia/Colombo";
const MINUTES_PER_HOUR = 60;
const FIRST_HOUR = 6;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });

describe("PAY-08, BKG-08 payments routes", () => {
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
        venueInput({ openingHours: openAllWeek, payAtVenue: true }),
      )
    ).body.data;
    resourceId = (
      await call(
        "POST",
        "/v1/resources",
        asStaff(tenant),
        resourceInput(venue.id, { price: rupees(3_000) }),
      )
    ).body.data.id;
  });

  /** A confirmed LKR 3,000 booking, an hour later than the last one. */
  async function newBooking() {
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    const startsAt = instantAt(
      addDays(todayIn(TIME_ZONE), 2),
      nextHour++ * MINUTES_PER_HOUR,
      TIME_ZONE,
    );
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startsAt.toISOString(),
    });
    return { id: reply.body.data.id as number, phone };
  }

  const cancel = (bookingId: number) =>
    call("PATCH", `/v1/bookings/${bookingId}`, asManager(), {
      status: "CANCELLED",
      cancelReason: "Rain",
    });

  it("frontDesk_recordsCash_andTheBookingShowsWhatIsPaidAndLeft", async () => {
    const booking = await newBooking();

    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(1_000),
    });

    expect(reply).toMatchObject({
      status: 201,
      body: {
        status: 201,
        message: "success",
        data: { bookingId: booking.id, kind: "CASH", status: "ACCEPTED", amount: rupees(1_000) },
      },
    });
    const seen = await call("GET", `/v1/bookings/${booking.id}`, asFrontDesk());
    expect(seen.body.data).toMatchObject({ paid: rupees(1_000), balance: rupees(2_000) });
    const own = await call("GET", "/v1/bookings", asCustomer(tenant, booking.phone));
    expect(own.body.data.content).toEqual([
      expect.objectContaining({ paid: rupees(1_000), balance: rupees(2_000) }),
    ]);
  });

  it("frontDesk_recordingARefund_isRefusedWith403", async () => {
    const booking = await newBooking();
    await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(3_000),
    });
    await cancel(booking.id);

    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "REFUND",
      amount: rupees(3_000),
    });

    expect(reply).toMatchObject({ status: 403, body: { code: "tt_pay_007" } });
  });

  it("manager_recordsARefundWithANote", async () => {
    const booking = await newBooking();
    await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(3_000),
    });
    await cancel(booking.id);

    const reply = await call("POST", "/v1/payments", asManager(), {
      bookingId: booking.id,
      kind: "REFUND",
      amount: rupees(3_000),
      note: "  Paid back to BOC 0071 2345 678  ",
    });

    expect(reply).toMatchObject({
      status: 201,
      body: { data: { amount: rupees(-3_000), note: "Paid back to BOC 0071 2345 678" } },
    });
  });

  it("list_filtersByBookingAndKind_newestFirst", async () => {
    const booking = await newBooking();
    const other = await newBooking();
    for (const [bookingId, amount] of [
      [booking.id, 500],
      [booking.id, 700],
      [other.id, 900],
    ] as const)
      await call("POST", "/v1/payments", asFrontDesk(), {
        bookingId,
        kind: "CASH",
        amount: rupees(amount),
      });

    const reply = await call(
      "GET",
      `/v1/payments?bookingId=${booking.id}&kind=CASH`,
      asFrontDesk(),
    );

    expect(reply.status).toBe(200);
    expect(reply.body.data.content.map((payment: { amount: unknown }) => payment.amount)).toEqual([
      rupees(700),
      rupees(500),
    ]);
    const [newest] = reply.body.data.content;
    const one = await call("GET", `/v1/payments/${newest.id}`, asFrontDesk());
    expect(one.body.data).toEqual(newest);
  });

  it("create_refusesAnAmountOfZero", async () => {
    const booking = await newBooking();
    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(0),
    });
    expect(reply).toMatchObject({
      status: 400,
      body: { errors: [expect.objectContaining({ field: "amount.amount" })] },
    });
  });

  it("create_refusesATransferWithoutAReceipt", async () => {
    const booking = await newBooking();
    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: booking.id,
      kind: "TRANSFER",
      amount: rupees(1_000),
    });
    expect(reply).toMatchObject({ status: 400, body: { code: "tt_htt_400" } });
  });

  it("customer_cannotSeeOrRecordPayments", async () => {
    const booking = await newBooking();
    const asTheCustomer = asCustomer(tenant, booking.phone);
    const list = await call("GET", "/v1/payments", asTheCustomer);
    const create = await call("POST", "/v1/payments", asTheCustomer, {
      bookingId: booking.id,
      kind: "CASH",
      amount: rupees(3_000),
    });
    expect([list.status, create.status]).toEqual([403, 403]);
  });

  it("get_unknownPayment_isNotFound", async () => {
    const reply = await call("GET", "/v1/payments/999999999", asFrontDesk());
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });
});
