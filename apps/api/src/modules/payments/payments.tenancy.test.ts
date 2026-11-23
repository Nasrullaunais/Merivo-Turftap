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

const TEN_O_CLOCK = 10 * 60;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const cash = { amount: 50_000, currency: "LKR" };

describe("payments tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let bookingOfB: number;
  let paymentOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenantB),
        venueInput({ openingHours: openAllWeek, payAtVenue: true }),
      )
    ).body.data;
    const resourceId = (
      await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venue.id))
    ).body.data.id;
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenantB, phone), { name: "Nimal", phone });
    bookingOfB = (
      await call("POST", "/v1/bookings", asCustomer(tenantB, phone), {
        resourceId,
        startsAt: instantAt(addDays(todayIn("Asia/Colombo"), 2), TEN_O_CLOCK, "Asia/Colombo"),
      })
    ).body.data.id;
    paymentOfB = (
      await call("POST", "/v1/payments", asStaff(tenantB), {
        bookingId: bookingOfB,
        kind: "CASH",
        amount: cash,
      })
    ).body.data.id;
  });

  it("payments_anotherTenantsPaymentIsNeverSeen", async () => {
    const list = await call("GET", "/v1/payments", asStaff(tenantA));
    expect(list.body.data.totalElements).toBe(0);
    const filtered = await call("GET", `/v1/payments?bookingId=${bookingOfB}`, asStaff(tenantA));
    expect(filtered.body.data.totalElements).toBe(0);
    const one = await call("GET", `/v1/payments/${paymentOfB}`, asStaff(tenantA));
    expect(one).toMatchObject({ status: 404, body: { code: "tt_pay_001" } });
  });

  it("payments_cannotBeRecordedOnAnotherTenantsBooking", async () => {
    const reply = await call("POST", "/v1/payments", asStaff(tenantA), {
      bookingId: bookingOfB,
      kind: "CASH",
      amount: cash,
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
    const own = await call("GET", `/v1/bookings/${bookingOfB}`, asStaff(tenantB));
    expect(own.body.data.paid).toEqual(cash);
  });
});
