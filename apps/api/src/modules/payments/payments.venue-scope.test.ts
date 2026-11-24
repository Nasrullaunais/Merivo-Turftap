import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  limitToVenues,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

const TEN_O_CLOCK = 10 * 60;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const cash = { amount: 50_000, currency: "LKR" };

describe("SIG-06 payments for staff limited to some venues", () => {
  let tenant: TestTenant;
  let bookingA: number;
  let bookingB: number;
  let paymentA: number;
  let paymentB: number;
  const asFrontDesk = () => asStaff(tenant, tenant.frontDesk);

  beforeAll(async () => {
    tenant = await createTenant();
    const addBooking = async () => {
      const venue = (
        await call(
          "POST",
          "/v1/venues",
          asStaff(tenant),
          venueInput({ openingHours: openAllWeek, payAtVenue: true }),
        )
      ).body.data;
      const resourceId = (
        await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venue.id))
      ).body.data.id;
      const phone = uniquePhone();
      await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
      const booking = (
        await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
          resourceId,
          startsAt: instantAt(addDays(todayIn("Asia/Colombo"), 2), TEN_O_CLOCK, "Asia/Colombo"),
        })
      ).body.data;
      const payment = (
        await call("POST", "/v1/payments", asStaff(tenant), {
          bookingId: booking.id,
          kind: "CASH",
          amount: cash,
        })
      ).body.data;
      return { venueId: venue.id as number, bookingId: booking.id, paymentId: payment.id };
    };
    const a = await addBooking();
    const b = await addBooking();
    ({ bookingId: bookingA, paymentId: paymentA } = a);
    ({ bookingId: bookingB, paymentId: paymentB } = b);
    await limitToVenues(tenant, tenant.frontDesk, [a.venueId]);
  });

  it("payments_listShowsOnlyTheirVenues", async () => {
    const reply = await call("GET", "/v1/payments", asFrontDesk());
    expect(reply.body.data.content.map((payment: { id: number }) => payment.id)).toEqual([
      paymentA,
    ]);
    const owner = await call("GET", "/v1/payments", asStaff(tenant));
    expect(owner.body.data.totalElements).toBe(2);
  });

  it("payments_getRepliesNotFoundForAnotherVenuesPayment", async () => {
    expect((await call("GET", `/v1/payments/${paymentA}`, asFrontDesk())).status).toBe(200);
    const reply = await call("GET", `/v1/payments/${paymentB}`, asFrontDesk());
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });

  it("payments_cannotBeRecordedOnAnotherVenuesBooking", async () => {
    const own = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: bookingA,
      kind: "CASH",
      amount: cash,
    });
    expect(own.status).toBe(201);
    const reply = await call("POST", "/v1/payments", asFrontDesk(), {
      bookingId: bookingB,
      kind: "CASH",
      amount: cash,
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
  });

  it("payments_cannotBeCheckedAtAnotherVenue", async () => {
    const reply = await call("PATCH", `/v1/payments/${paymentB}`, asFrontDesk(), {
      status: "REJECTED",
      rejectReason: "Wrong amount",
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });
});
