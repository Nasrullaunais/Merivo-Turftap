import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

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

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** A whole hour some days ahead, so tests never depend on the time they run. */
const at = (days: number, hour: number) => {
  const midnight = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  return new Date(midnight + days * DAY_MS + hour * HOUR_MS).toISOString();
};

async function addResource(tenant: TestTenant) {
  const venueId = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id;
  return (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId))).body.data
    .id as number;
}

describe("VEN-07 block a resource", () => {
  let tenant: TestTenant;
  let resourceId: number;
  beforeEach(async () => {
    tenant = await createTenant();
    resourceId = await addResource(tenant);
  });

  const block = (body: object) =>
    call("POST", "/v1/blocked-times", asStaff(tenant), { resourceId, ...body });

  it("create_blocksATimeWindowAndRepliesWithTheEnvelope", async () => {
    const reply = await block({ startsAt: at(3, 4), endsAt: at(3, 6), reason: " Repainting " });
    expect(reply).toMatchObject({ status: 201, body: { status: 201, message: "success" } });
    expect(reply.body.data).toMatchObject({
      resourceId,
      startsAt: at(3, 4),
      endsAt: at(3, 6),
      reason: "Repainting",
    });
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_canSpanSeveralDays", async () => {
    expect((await block({ startsAt: at(3, 4), endsAt: at(5, 12) })).status).toBe(201);
  });

  it("create_refusesAnEndBeforeTheStart", async () => {
    const reply = await block({ startsAt: at(3, 6), endsAt: at(3, 4) });
    expect(reply.status).toBe(400);
    expect(reply.body.errors).toEqual([{ field: "endsAt", message: "Must end after it starts" }]);
  });

  it("create_refusesABlockThatHasAlreadyEnded", async () => {
    const reply = await block({ startsAt: at(-2, 4), endsAt: at(-2, 6) });
    expect(reply.body.errors).toEqual([{ field: "endsAt", message: "Must end in the future" }]);
  });

  it("create_refusesAnOverlapAndNamesTheClashingBlockInTheVenuesTime", async () => {
    await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    const reply = await block({ startsAt: at(3, 5), endsAt: at(3, 7) });
    const colombo = (iso: string) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Colombo",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(iso));
    expect(reply).toMatchObject({
      status: 409,
      body: {
        code: "tt_ven_010",
        message: `This overlaps the Blocked Time from ${colombo(at(3, 4))} to ${colombo(at(3, 6))}`,
      },
    });
  });

  it("create_allowsBackToBackBlocks", async () => {
    await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    expect((await block({ startsAt: at(3, 6), endsAt: at(3, 8) })).status).toBe(201);
  });

  it("create_allowsTheSameTimeOnAnotherResource", async () => {
    await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    const other = await addResource(tenant);
    const reply = await call("POST", "/v1/blocked-times", asStaff(tenant), {
      resourceId: other,
      startsAt: at(3, 4),
      endsAt: at(3, 6),
    });
    expect(reply.status).toBe(201);
  });

  it("create_refusesAResourceThatDoesNotExist", async () => {
    const reply = await call("POST", "/v1/blocked-times", asStaff(tenant), {
      resourceId: 999_999_999,
      startsAt: at(3, 4),
      endsAt: at(3, 6),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("update_movesTheBlockWithoutClashingWithItself", async () => {
    const created = await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    const path = `/v1/blocked-times/${created.body.data.id}`;
    const reply = await call("PATCH", path, asStaff(tenant), {
      endsAt: at(3, 8),
      reason: "Longer",
    });
    expect(reply.body.data).toMatchObject({
      startsAt: at(3, 4),
      endsAt: at(3, 8),
      reason: "Longer",
    });
  });

  it("update_refusesAnEndBeforeTheStoredStart", async () => {
    const created = await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    const path = `/v1/blocked-times/${created.body.data.id}`;
    const reply = await call("PATCH", path, asStaff(tenant), { endsAt: at(3, 3) });
    expect(reply.body.errors).toEqual([{ field: "endsAt", message: "Must end after it starts" }]);
  });

  it("update_refusesMovingOntoAnotherBlock", async () => {
    await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    const second = await block({ startsAt: at(3, 8), endsAt: at(3, 10) });
    const path = `/v1/blocked-times/${second.body.data.id}`;
    const reply = await call("PATCH", path, asStaff(tenant), { startsAt: at(3, 5) });
    expect(reply).toMatchObject({ status: 409, body: { code: "tt_ven_010" } });
  });

  it("delete_unblocksTheTime", async () => {
    const created = await block({ startsAt: at(3, 4), endsAt: at(3, 6) });
    const path = `/v1/blocked-times/${created.body.data.id}`;
    expect((await call("DELETE", path, asStaff(tenant))).status).toBe(200);
    expect(await call("GET", path, asStaff(tenant))).toMatchObject({
      status: 404,
      body: { code: "tt_ven_009" },
    });
    expect((await block({ startsAt: at(3, 4), endsAt: at(3, 6) })).status).toBe(201);
  });

  it("list_showsBlocksThatTouchTheWindowInStartOrder", async () => {
    for (const day of [6, 2, 1, 4]) await block({ startsAt: at(day, 4), endsAt: at(day, 6) });
    const query = `resourceId=${resourceId}&from=${at(2, 5)}&to=${at(5, 0)}`;
    const reply = await call("GET", `/v1/blocked-times?${query}`, asStaff(tenant));
    const starts = reply.body.data.content.map((row: { startsAt: string }) => row.startsAt);
    expect(starts).toEqual([at(2, 4), at(4, 4)]);
  });
});

describe("VEN-07 a Blocked Time can't cover a booking", () => {
  const TIME_ZONE = "Asia/Colombo";
  const MINUTES_PER_HOUR = 60;
  const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    opens: "06:00",
    closes: "23:00",
  }));
  /** `hour` o'clock in Colombo, two days from now, as ISO text. */
  const colomboAt = (hour: number) =>
    instantAt(addDays(todayIn(TIME_ZONE), 2), hour * MINUTES_PER_HOUR, TIME_ZONE).toISOString();
  const shownInColombo = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));

  let tenant: TestTenant;
  let resourceId: number;
  beforeEach(async () => {
    tenant = await createTenant();
    const venue = await call(
      "POST",
      "/v1/venues",
      asStaff(tenant),
      venueInput({ openingHours: openAllWeek, payAtVenue: true }),
    );
    const resource = await call(
      "POST",
      "/v1/resources",
      asStaff(tenant),
      resourceInput(venue.body.data.id),
    );
    resourceId = resource.body.data.id;
  });

  async function newCustomer(name: string) {
    const phone = uniquePhone();
    await call("POST", "/v1/customers", asCustomer(tenant, phone), { name, phone });
    return phone;
  }

  const bookAs = (phone: string, hour: number) =>
    call("POST", "/v1/bookings", asCustomer(tenant, phone), {
      resourceId,
      startsAt: colomboAt(hour),
    });

  async function book(name: string, hour: number) {
    const phone = await newCustomer(name);
    return { reply: await bookAs(phone, hour), phone };
  }

  const block = (startHour: number, endHour: number) =>
    call("POST", "/v1/blocked-times", asStaff(tenant, tenant.manager), {
      resourceId,
      startsAt: colomboAt(startHour),
      endsAt: colomboAt(endHour),
    });

  it("create_overAConfirmedBooking_isRefusedNamingTheCustomerAndStartTime", async () => {
    const { reply: booked } = await book("Nimal Perera", 10);
    expect(booked.body.data.status).toBe("CONFIRMED");
    const reply = await block(9, 12);
    expect(reply).toMatchObject({
      status: 409,
      body: {
        code: "tt_ven_014",
        message: `This overlaps the booking for Nimal Perera at ${shownInColombo(colomboAt(10))}`,
      },
    });
  });

  it("create_overSeveralBookings_namesTheEarliest", async () => {
    await book("Later Customer", 14);
    await book("Earlier Customer", 11);
    const reply = await block(9, 16);
    expect(reply.body.message).toContain("Earlier Customer");
  });

  it("create_overABookingWaitingForPayment_isRefused", async () => {
    const venue = await call(
      "POST",
      "/v1/venues",
      asStaff(tenant),
      venueInput({ openingHours: openAllWeek }),
    );
    const resource = await call(
      "POST",
      "/v1/resources",
      asStaff(tenant),
      resourceInput(venue.body.data.id),
    );
    resourceId = resource.body.data.id;
    const { reply: booked } = await book("Kamal Silva", 10);
    expect(booked.body.data.status).toBe("AWAITING_PAYMENT");
    expect(await block(10, 11)).toMatchObject({ status: 409, body: { code: "tt_ven_014" } });
  });

  it("create_rightAfterABooking_isAllowed", async () => {
    await book("Nimal Perera", 10);
    expect((await block(11, 13)).status).toBe(201);
  });

  it("create_overACancelledBooking_isAllowed", async () => {
    const { reply: booked, phone } = await book("Nimal Perera", 10);
    await call("PATCH", `/v1/bookings/${booked.body.data.id}`, asCustomer(tenant, phone), {
      status: "CANCELLED",
    });
    expect((await block(10, 11)).status).toBe(201);
  });

  it("bookingAndBlockSavedAtTheSameTime_onlyOneIsKept", async () => {
    const phone = await newCustomer("Nimal Perera");
    const [booked, blocked] = await Promise.all([bookAs(phone, 10), block(10, 11)]);
    expect([booked.status, blocked.status].sort()).toEqual([201, 409]);
  });

  it("update_movingABlockOntoABooking_isRefused", async () => {
    await book("Nimal Perera", 15);
    const created = await block(10, 11);
    const path = `/v1/blocked-times/${created.body.data.id}`;
    const reply = await call("PATCH", path, asStaff(tenant, tenant.manager), {
      endsAt: colomboAt(16),
    });
    expect(reply).toMatchObject({ status: 409, body: { code: "tt_ven_014" } });
    expect(reply.body.message).toContain("Nimal Perera");
  });
});

describe("SIG-05 Blocked Time permissions", () => {
  let tenant: TestTenant;
  let resourceId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    resourceId = await addResource(tenant);
  });

  it("manager_canBlockChangeAndUnblock", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    const created = await call("POST", "/v1/blocked-times", asManager, {
      resourceId,
      startsAt: at(2, 4),
      endsAt: at(2, 6),
    });
    expect(created.status).toBe(201);
    const path = `/v1/blocked-times/${created.body.data.id}`;
    expect((await call("PATCH", path, asManager, { reason: "Event" })).status).toBe(200);
    expect((await call("DELETE", path, asManager)).status).toBe(200);
  });

  it("frontDesk_canReadButNotBlock", async () => {
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    expect((await call("GET", "/v1/blocked-times", asFrontDesk)).status).toBe(200);
    const reply = await call("POST", "/v1/blocked-times", asFrontDesk, {
      resourceId,
      startsAt: at(2, 8),
      endsAt: at(2, 9),
    });
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });

  it("customers_cannotListBlockedTimes", async () => {
    const reply = await call("GET", "/v1/blocked-times", { tenantSlug: tenant.slug });
    expect(reply.status).toBe(401);
  });
});
