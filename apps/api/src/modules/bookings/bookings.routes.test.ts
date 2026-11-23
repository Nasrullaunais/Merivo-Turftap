import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asAssistant,
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
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const bankAccount = {
  bankName: "Bank of Ceylon",
  branch: null,
  accountName: "Kick Off Arena (Pvt) Ltd",
  accountNumber: "0071 2345 678",
};
/** An ISO start time `hour` o'clock in Colombo, two days from now. */
const startAt = (hour: number) =>
  instantAt(addDays(todayIn(TIME_ZONE), 2), hour * MINUTES_PER_HOUR, TIME_ZONE).toISOString();

describe("BKG-02 bookings routes", () => {
  let tenant: TestTenant;
  let resourceId: number;

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenant),
        venueInput({ openingHours: openAllWeek, bankAccount, advancePercent: 50 }),
      )
    ).body.data;
    resourceId = (
      await call(
        "POST",
        "/v1/resources",
        asStaff(tenant),
        resourceInput(venue.id, { price: { amount: 300_000, currency: "LKR" } }),
      )
    ).body.data.id;
  });

  async function newCustomer() {
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    return phone;
  }

  it("customer_booksAndIsToldHowMuchToPayAndWhere", async () => {
    const phone = await newCustomer();
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startAt(10),
    });
    expect(reply.status).toBe(201);
    expect(reply.body.data).toMatchObject({
      resourceId,
      startsAt: startAt(10),
      status: "AWAITING_PAYMENT",
      price: { amount: 300_000, currency: "LKR" },
      amountDue: { amount: 150_000, currency: "LKR" },
      bankAccount,
    });
    expect(reply.body.data.expiresAt).toEndWith("Z");
  });

  it("assistant_booksForTheCustomerItActsFor", async () => {
    const phone = await newCustomer();
    const reply = await call("POST", "/v1/bookings", asAssistant(tenant, phone), {
      resourceId,
      startsAt: startAt(11),
      slots: 2,
    });
    expect(reply.status).toBe(201);
    expect(reply.body.data.endsAt).toBe(startAt(13));
  });

  it("customer_withNoCustomerRecordIsAskedForTheirName", async () => {
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, uniquePhone()), {
      resourceId,
      startsAt: startAt(14),
    });
    expect(reply).toMatchObject({ status: 409, body: { code: "tt_bkg_005" } });
  });

  it("customer_secondBookingWhileOneWaitsForPayment_isTold", async () => {
    const phone = await newCustomer();
    await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startAt(15),
    });
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startAt(17),
    });
    expect(reply).toMatchObject({
      status: 409,
      body: {
        code: "tt_bkg_003",
        message: "You already have a booking waiting for payment. Pay for it or cancel it first",
      },
    });
  });

  it("create_refusesZeroSlots", async () => {
    const phone = await newCustomer();
    const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: startAt(19),
      slots: 0,
    });
    expect(reply.status).toBe(400);
    expect(reply.body.errors.map((error: { field: string }) => error.field)).toEqual(["slots"]);
  });

  it("notSignedIn_cannotBookOrList", async () => {
    const asPublic = { tenantSlug: tenant.slug };
    const body = { resourceId, startsAt: startAt(20) };
    expect((await call("POST", "/v1/bookings", asPublic, body)).status).toBe(401);
    expect((await call("GET", "/v1/bookings", asPublic)).status).toBe(401);
  });

  it("customer_seesOnlyTheirOwnBookings", async () => {
    const mine = await newCustomer();
    const theirs = await newCustomer();
    const myBooking = (
      await call("POST", "/v1/bookings", asCustomer(tenant, mine), {
        resourceId,
        startsAt: startAt(6),
      })
    ).body.data;
    const theirBooking = (
      await call("POST", "/v1/bookings", asCustomer(tenant, theirs), {
        resourceId,
        startsAt: startAt(7),
      })
    ).body.data;
    const list = await call("GET", "/v1/bookings", asCustomer(tenant, mine));
    expect(list.body.data.content.map((booking: { id: number }) => booking.id)).toEqual([
      myBooking.id,
    ]);
    const filtered = await call(
      "GET",
      `/v1/bookings?customerId=${theirBooking.customerId}`,
      asAssistant(tenant, mine),
    );
    expect(filtered.body.data.content).toEqual([]);
    const other = await call("GET", `/v1/bookings/${theirBooking.id}`, asCustomer(tenant, mine));
    expect(other).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
    const stranger = await call("GET", "/v1/bookings", asCustomer(tenant, uniquePhone()));
    expect(stranger.body.data.content).toEqual([]);
  });

  it("frontDesk_seesAndFiltersEveryBookingButCannotBookOnlineForSomeone", async () => {
    const phone = await newCustomer();
    const booking = (
      await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
        resourceId,
        startsAt: startAt(8),
      })
    ).body.data;
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    const filters = new URLSearchParams({
      resourceId: String(resourceId),
      status: "AWAITING_PAYMENT",
      from: startAt(8),
      to: startAt(9),
    });
    const list = await call("GET", `/v1/bookings?${filters}`, asFrontDesk);
    expect(list.body.data.content.map((found: { id: number }) => found.id)).toEqual([booking.id]);
    const seen = await call("GET", `/v1/bookings/${booking.id}`, asFrontDesk);
    expect(seen.body.data).toMatchObject({ id: booking.id, bankAccount });
    const reply = await call("POST", "/v1/bookings", asFrontDesk, {
      resourceId,
      startsAt: startAt(21),
    });
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });
});

describe("BKG-06, BKG-07 cancel routes", () => {
  let tenant: TestTenant;
  let resourceId: number;

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = (
      await call(
        "POST",
        "/v1/venues",
        asStaff(tenant),
        venueInput({ openingHours: openAllWeek, bankAccount }),
      )
    ).body.data;
    resourceId = (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venue.id)))
      .body.data.id;
  });

  async function bookAsNewCustomer(hour: number) {
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    const booking = (
      await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
        resourceId,
        startsAt: startAt(hour),
      })
    ).body.data;
    return { phone, id: booking.id as number };
  }

  it("customer_cancelsTheirOwnBooking", async () => {
    const { phone, id } = await bookAsNewCustomer(10);
    const reply = await call("PATCH", `/v1/bookings/${id}`, asCustomer(tenant, phone), {
      status: "CANCELLED",
    });
    expect(reply).toMatchObject({
      status: 200,
      body: { data: { id, status: "CANCELLED", cancelReason: null, bankAccount: null } },
    });
  });

  it("frontDesk_cancelsWithAReason", async () => {
    const { id } = await bookAsNewCustomer(11);
    const reply = await call("PATCH", `/v1/bookings/${id}`, asStaff(tenant, tenant.frontDesk), {
      status: "CANCELLED",
      cancelReason: "  Rain  ",
    });
    expect(reply).toMatchObject({
      status: 200,
      body: { data: { status: "CANCELLED", cancelReason: "Rain" } },
    });
  });

  it("frontDesk_withoutAReason_isAskedForOne", async () => {
    const { id } = await bookAsNewCustomer(12);
    const reply = await call("PATCH", `/v1/bookings/${id}`, asStaff(tenant, tenant.frontDesk), {
      status: "CANCELLED",
    });
    expect(reply).toMatchObject({
      status: 400,
      body: {
        code: "tt_bkg_007",
        errors: [{ field: "cancelReason", message: "Required when staff cancel a booking" }],
      },
    });
  });

  it("patch_refusesAnyChangeOtherThanCancelling", async () => {
    const { id } = await bookAsNewCustomer(13);
    const reply = await call("PATCH", `/v1/bookings/${id}`, asStaff(tenant), {
      status: "CONFIRMED",
    });
    expect(reply).toMatchObject({ status: 409, body: { code: "tt_sts_001" } });
  });
});
