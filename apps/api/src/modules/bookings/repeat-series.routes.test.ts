import { beforeAll, describe, expect, it } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  limitToVenues,
  queuedMessagesFor,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import { bookings } from "./bookings.tables";

const TIME_ZONE = "Asia/Colombo";
const MINUTES_PER_HOUR = 60;
const DAYS_PER_WEEK = 7;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));
const firstDate = addDays(todayIn(TIME_ZONE), 2);
const weekOf = (week: number) => addDays(firstDate, week * DAYS_PER_WEEK);
/** ISO start of `hour` o'clock in Colombo on the series' week number `week`, counting from 0. */
const at = (week: number, hour: number) =>
  instantAt(weekOf(week), hour * MINUTES_PER_HOUR, TIME_ZONE).toISOString();

type Booking = { id: number; startsAt: string; status: string; cancelReason: string | null };

/** A venue and court of their own, so each test books on a clear calendar. */
async function newCourt(tenant: TestTenant) {
  const venueName = `Kick Off Arena ${crypto.randomUUID().slice(0, 6)}`;
  const venueId = (
    await call(
      "POST",
      "/v1/venues",
      asStaff(tenant),
      venueInput({
        name: venueName,
        openingHours: openAllWeek,
        advancePercent: 50,
        seriesPaymentDaysBefore: 3,
      }),
    )
  ).body.data.id as number;
  const resourceId = (
    await call(
      "POST",
      "/v1/resources",
      asStaff(tenant),
      resourceInput(venueId, { name: "Court 1", price: { amount: 300_000, currency: "LKR" } }),
    )
  ).body.data.id as number;
  return { venueId, venueName, resourceId };
}

const seriesInput = (resourceId: number, overrides: Record<string, unknown> = {}) => ({
  resourceId,
  startsAt: at(0, 18),
  weeks: 8,
  customerName: "Kasun Silva",
  customerPhone: uniquePhone(),
  ...overrides,
});

describe("BKG-09 repeat-series routes", () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    tenant = await createTenant();
  });

  const bookingsOf = async (seriesId: number) =>
    (
      await call(
        "GET",
        `/v1/bookings?repeatSeriesId=${seriesId}&size=100&sort=startsAt,asc`,
        asStaff(tenant),
      )
    ).body.data.content as Booking[];

  it("create_booksEveryWeekConfirmed_withTheVenuesPaymentSettingsCopied", async () => {
    const { venueId, resourceId } = await newCourt(tenant);
    const input = seriesInput(resourceId, { weeks: 4, slots: 2 });
    const reply = await call("POST", "/v1/repeat-series", asStaff(tenant, tenant.manager), input);
    expect(reply).toMatchObject({
      status: 201,
      body: {
        data: {
          venueId,
          resourceId,
          customerName: "Kasun Silva",
          customerPhone: input.customerPhone,
          firstDate,
          startTime: "18:00",
          slots: 2,
          weeks: 4,
          status: "ACTIVE",
          cancelReason: null,
          seriesPaymentDaysBefore: 3,
          advancePercent: 50,
        },
      },
    });
    const made = await bookingsOf(reply.body.data.id);
    expect(made.map((booking) => booking.startsAt)).toEqual([0, 1, 2, 3].map((w) => at(w, 18)));
    expect(made[0]).toMatchObject({
      endsAt: at(0, 20),
      status: "CONFIRMED",
      customerId: reply.body.data.customerId,
      repeatSeriesId: reply.body.data.id,
      price: { amount: 600_000, currency: "LKR" },
      amountDue: { amount: 0, currency: "LKR" },
      balance: { amount: 600_000, currency: "LKR" },
      expiresAt: null,
    });
  });

  it("create_withAnyWeekNotFree_refusesNamingEveryClashingDateAndSavesNothing", async () => {
    const { venueId, resourceId } = await newCourt(tenant);
    await call("POST", "/v1/bookings", asStaff(tenant), {
      resourceId,
      startsAt: at(2, 18),
      walkIn: { customerName: "Ruwan", customerPhone: uniquePhone(), payment: "PAY_LATER" },
    });
    await call("POST", "/v1/blocked-times", asStaff(tenant), {
      resourceId,
      startsAt: at(4, 17),
      endsAt: at(4, 19),
    });
    await call("POST", "/v1/closed-dates", asStaff(tenant), { venueId, date: weekOf(5) });

    const reply = await call("POST", "/v1/repeat-series", asStaff(tenant), seriesInput(resourceId));

    expect(reply).toMatchObject({
      status: 409,
      body: { code: "tt_bkg_009", clashingDates: [weekOf(2), weekOf(4), weekOf(5)] },
    });
    expect(reply.body.message).toContain(weekOf(2));
    const series = await call("GET", `/v1/repeat-series?resourceId=${resourceId}`, asStaff(tenant));
    expect(series.body.data.content).toEqual([]);
    const all = await call("GET", `/v1/bookings?resourceId=${resourceId}`, asStaff(tenant));
    expect(all.body.data.totalElements).toBe(1);
  });

  it("create_withTheClashingDateSkipped_booksTheOtherSevenWeeks", async () => {
    const { venueId, resourceId } = await newCourt(tenant);
    await call("POST", "/v1/closed-dates", asStaff(tenant), { venueId, date: weekOf(3) });
    const input = seriesInput(resourceId);
    const refused = await call("POST", "/v1/repeat-series", asStaff(tenant), input);
    expect(refused.body.clashingDates).toEqual([weekOf(3)]);

    const reply = await call("POST", "/v1/repeat-series", asStaff(tenant), {
      ...input,
      skipDates: refused.body.clashingDates,
    });

    expect(reply.status).toBe(201);
    expect(reply.body.data.weeks).toBe(8);
    const made = await bookingsOf(reply.body.data.id);
    expect(made.map((booking) => booking.startsAt)).toEqual(
      [0, 1, 2, 4, 5, 6, 7].map((week) => at(week, 18)),
    );
  });

  it("create_atATimeThatNeverFits_isRefusedAsNotBookable", async () => {
    const { resourceId } = await newCourt(tenant);
    const offTheClock = instantAt(firstDate, 18 * MINUTES_PER_HOUR + 10, TIME_ZONE).toISOString();
    for (const startsAt of [offTheClock, at(0, 22.5)]) {
      const reply = await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { startsAt }),
      );
      expect(reply).toMatchObject({ status: 409, body: { code: "tt_bkg_004" } });
      expect(reply.body.clashingDates).toBeUndefined();
    }
  });

  it("create_withEveryWeekSkipped_isRefused", async () => {
    const { resourceId } = await newCourt(tenant);
    const reply = await call(
      "POST",
      "/v1/repeat-series",
      asStaff(tenant),
      seriesInput(resourceId, { weeks: 2, skipDates: [weekOf(0), weekOf(1)] }),
    );
    expect(reply).toMatchObject({
      status: 400,
      body: { code: "tt_bkg_011", errors: [{ field: "skipDates" }] },
    });
  });

  it("create_withTooFewOrTooManyWeeks_namesTheField", async () => {
    const { resourceId } = await newCourt(tenant);
    for (const weeks of [1, 53]) {
      const reply = await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { weeks }),
      );
      expect(reply).toMatchObject({ status: 400, body: { errors: [{ field: "weeks" }] } });
    }
  });

  it("cancel_cancelsTheUpcomingBookings_leavesPastOnes_andTellsTheCustomerOnce", async () => {
    const { venueName, resourceId } = await newCourt(tenant);
    const series = (
      await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { weeks: 4 }),
      )
    ).body.data;
    const [first] = await bookingsOf(series.id);
    // The first week has already been played.
    await db()
      .update(bookings)
      .set({
        startsAt: sql`now() - interval '3 hours'`,
        endsAt: sql`now() - interval '1 hour'`,
      })
      .where(eq(bookings.id, first!.id));

    const reply = await call("PATCH", `/v1/repeat-series/${series.id}`, asStaff(tenant), {
      status: "CANCELLED",
      cancelReason: "Team stopped playing",
    });

    expect(reply).toMatchObject({
      status: 200,
      body: { data: { status: "CANCELLED", cancelReason: "Team stopped playing" } },
    });
    const after = await bookingsOf(series.id);
    expect(after.map(({ status, cancelReason }) => ({ status, cancelReason }))).toEqual([
      { status: "CONFIRMED", cancelReason: null },
      ...[1, 2, 3].map(() => ({ status: "CANCELLED", cancelReason: "Team stopped playing" })),
    ]);
    expect(await queuedMessagesFor(series.customerId)).toEqual([
      {
        tenantId: tenant.id,
        customerId: series.customerId,
        template: "series_cancelled",
        values: [
          venueName,
          "Court 1",
          expect.stringMatching(/ 18:00$/),
          "3",
          "Team stopped playing",
        ],
      },
    ]);
  });

  it("cancel_withoutAReason_orTwice_isRefused", async () => {
    const { resourceId } = await newCourt(tenant);
    const series = (
      await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { weeks: 2 }),
      )
    ).body.data;
    const path = `/v1/repeat-series/${series.id}`;
    const noReason = await call("PATCH", path, asStaff(tenant), { status: "CANCELLED" });
    expect(noReason).toMatchObject({ status: 400, body: { code: "tt_bkg_007" } });
    expect((await bookingsOf(series.id)).every((b) => b.status === "CONFIRMED")).toBe(true);

    const body = { status: "CANCELLED", cancelReason: "Rain" };
    expect((await call("PATCH", path, asStaff(tenant), body)).status).toBe(200);
    const again = await call("PATCH", path, asStaff(tenant), body);
    expect(again).toMatchObject({ status: 409, body: { code: "tt_sts_001" } });
  });

  it("oneBookingOfTheSeries_isCancelledOnItsOwn_andTheRestStay", async () => {
    const { resourceId } = await newCourt(tenant);
    const series = (
      await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { weeks: 3 }),
      )
    ).body.data;
    const [, second] = await bookingsOf(series.id);
    await call("PATCH", `/v1/bookings/${second!.id}`, asStaff(tenant), {
      status: "CANCELLED",
      cancelReason: "Away that week",
    });
    expect((await bookingsOf(series.id)).map((booking) => booking.status)).toEqual([
      "CONFIRMED",
      "CANCELLED",
      "CONFIRMED",
    ]);
    const seen = await call("GET", `/v1/repeat-series/${series.id}`, asStaff(tenant));
    expect(seen.body.data.status).toBe("ACTIVE");
  });

  it("frontDesk_seesSeriesButCannotCreateOrCancelThem", async () => {
    const { resourceId } = await newCourt(tenant);
    const series = (
      await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { weeks: 2 }),
      )
    ).body.data;
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);

    const list = await call("GET", `/v1/repeat-series?resourceId=${resourceId}`, asFrontDesk);
    expect(list.body.data.content.map((found: { id: number }) => found.id)).toEqual([series.id]);
    expect((await call("GET", `/v1/repeat-series/${series.id}`, asFrontDesk)).status).toBe(200);
    const create = await call("POST", "/v1/repeat-series", asFrontDesk, seriesInput(resourceId));
    expect(create.status).toBe(403);
    const cancel = await call("PATCH", `/v1/repeat-series/${series.id}`, asFrontDesk, {
      status: "CANCELLED",
      cancelReason: "Rain",
    });
    expect(cancel.status).toBe(403);
  });

  it("customer_cannotSeeOrCreateSeries", async () => {
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    const { resourceId } = await newCourt(tenant);
    const asTheCustomer = asCustomer(tenant, phone);
    expect((await call("GET", "/v1/repeat-series", asTheCustomer)).status).toBe(403);
    const create = await call("POST", "/v1/repeat-series", asTheCustomer, seriesInput(resourceId));
    expect(create.status).toBe(403);
  });
});

describe("repeat-series for staff limited to some venues", () => {
  it("manager_limitedToAnotherVenue_neitherSeesNorBooksThisVenuesSeries", async () => {
    const tenant = await createTenant();
    const { resourceId } = await newCourt(tenant);
    const series = (
      await call(
        "POST",
        "/v1/repeat-series",
        asStaff(tenant),
        seriesInput(resourceId, { weeks: 2 }),
      )
    ).body.data;
    const other = await newCourt(tenant);
    await limitToVenues(tenant, tenant.manager, [other.venueId]);
    const scoped = asStaff(tenant, tenant.manager);

    const seen = await call("GET", `/v1/repeat-series/${series.id}`, scoped);
    expect(seen).toMatchObject({ status: 404, body: { code: "tt_bkg_010" } });
    const list = await call("GET", "/v1/repeat-series", scoped);
    expect(list.body.data.content).toEqual([]);
    const create = await call("POST", "/v1/repeat-series", scoped, seriesInput(resourceId));
    expect(create.status).toBe(404);
  });
});
