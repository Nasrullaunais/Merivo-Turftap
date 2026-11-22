import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

import { eq } from "drizzle-orm";

import { db } from "../../lib/db";
import { todayIn } from "../../lib/time";
import { asStaff, call, createTenant, type TestTenant, venueInput } from "../../test/fixtures";
import { venues } from "./venues.tables";

const DAY_MS = 24 * 60 * 60 * 1000;
const COLOMBO = "Asia/Colombo";
const daysFromToday = (days: number) => todayIn(COLOMBO, new Date(Date.now() + days * DAY_MS));

const addVenue = async (tenant: TestTenant) =>
  (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id as number;

describe("VEN-02 close a venue for a day", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeEach(async () => {
    tenant = await createTenant();
    venueId = await addVenue(tenant);
  });

  const close = (body: object, as = asStaff(tenant)) =>
    call("POST", "/v1/closed-dates", as, { venueId, ...body });

  it("create_closesADateAndRepliesWithTheEnvelope", async () => {
    const date = daysFromToday(10);
    const reply = await close({ date, reason: " Vesak Poya " });
    expect(reply).toMatchObject({ status: 201, body: { status: 201, message: "success" } });
    expect(reply.body.data).toMatchObject({ venueId, date, reason: "Vesak Poya" });
    expect(reply.body.data.tenantId).toBeUndefined();
  });

  it("create_needsNoReason", async () => {
    const reply = await close({ date: daysFromToday(10) });
    expect(reply.body.data.reason).toBeNull();
  });

  it("create_refusesADateThatIsAlreadyClosed", async () => {
    const date = daysFromToday(10);
    await close({ date });
    const reply = await close({ date });
    expect(reply).toMatchObject({
      status: 409,
      body: { code: "tt_ven_008", message: "This venue is already closed on that date" },
    });
  });

  it("create_allowsTheSameDateAtAnotherVenue", async () => {
    const date = daysFromToday(10);
    await close({ date });
    const other = await addVenue(tenant);
    const reply = await call("POST", "/v1/closed-dates", asStaff(tenant), {
      venueId: other,
      date,
    });
    expect(reply.status).toBe(201);
  });

  it("create_allowsTodayInTheVenuesTimeZone", async () => {
    expect((await close({ date: daysFromToday(0) })).status).toBe(201);
  });

  it("create_judgesTodayByTheVenuesTimeZone", async () => {
    // Kiritimati (UTC+14) is always a day or more ahead of Pago Pago (UTC-11).
    const pagoPagoToday = todayIn("Pacific/Pago_Pago");
    const setZone = (timeZone: string) =>
      db().update(venues).set({ timeZone }).where(eq(venues.id, venueId));
    await setZone("Pacific/Kiritimati");
    expect((await close({ date: pagoPagoToday })).status).toBe(400);
    await setZone("Pacific/Pago_Pago");
    expect((await close({ date: pagoPagoToday })).status).toBe(201);
  });

  it("create_refusesYesterday", async () => {
    const reply = await close({ date: daysFromToday(-1) });
    expect(reply.status).toBe(400);
    expect(reply.body.errors).toEqual([{ field: "date", message: "Must be today or later" }]);
  });

  it("create_refusesADateNotWrittenAsYearMonthDay", async () => {
    const reply = await close({ date: "25/12/2026" });
    expect(reply.status).toBe(400);
    expect(reply.body.errors.map((error: { field: string }) => error.field)).toEqual(["date"]);
  });

  it("create_refusesAVenueThatDoesNotExist", async () => {
    const reply = await call("POST", "/v1/closed-dates", asStaff(tenant), {
      venueId: 999_999_999,
      date: daysFromToday(10),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
  });

  it("update_changesTheReasonAndTheDate", async () => {
    const created = await close({ date: daysFromToday(10) });
    const date = daysFromToday(11);
    const reply = await call("PATCH", `/v1/closed-dates/${created.body.data.id}`, asStaff(tenant), {
      date,
      reason: "Staff training",
    });
    expect(reply.body.data).toMatchObject({ date, reason: "Staff training" });
  });

  it("update_refusesMovingToAPastDate", async () => {
    const created = await close({ date: daysFromToday(10) });
    const path = `/v1/closed-dates/${created.body.data.id}`;
    const reply = await call("PATCH", path, asStaff(tenant), { date: daysFromToday(-3) });
    expect(reply.status).toBe(400);
    expect((await call("GET", path, asStaff(tenant))).body.data.date).toBe(daysFromToday(10));
  });

  it("update_refusesMovingOntoAnotherClosedDate", async () => {
    await close({ date: daysFromToday(10) });
    const second = await close({ date: daysFromToday(11) });
    const reply = await call("PATCH", `/v1/closed-dates/${second.body.data.id}`, asStaff(tenant), {
      date: daysFromToday(10),
    });
    expect(reply).toMatchObject({ status: 409, body: { code: "tt_ven_008" } });
  });

  it("delete_reopensTheDate", async () => {
    const date = daysFromToday(10);
    const created = await close({ date });
    const path = `/v1/closed-dates/${created.body.data.id}`;
    expect((await call("DELETE", path, asStaff(tenant))).status).toBe(200);
    expect(await call("GET", path, asStaff(tenant))).toMatchObject({
      status: 404,
      body: { code: "tt_ven_007" },
    });
    expect((await close({ date })).status).toBe(201);
  });

  it("list_filtersByVenueAndDatesInDateOrder", async () => {
    for (const days of [12, 10, 30, 11]) await close({ date: daysFromToday(days) });
    await call("POST", "/v1/closed-dates", asStaff(tenant), {
      venueId: await addVenue(tenant),
      date: daysFromToday(11),
    });
    const query = `venueId=${venueId}&from=${daysFromToday(11)}&to=${daysFromToday(20)}`;
    const reply = await call("GET", `/v1/closed-dates?${query}`, asStaff(tenant));
    const dates = reply.body.data.content.map((row: { date: string }) => row.date);
    expect(dates).toEqual([daysFromToday(11), daysFromToday(12)]);
  });

  it("list_isOpenWithOnlyTheTenantSlug", async () => {
    await close({ date: daysFromToday(10), reason: "Vesak Poya" });
    const reply = await call("GET", `/v1/closed-dates?venueId=${venueId}`, {
      tenantSlug: tenant.slug,
    });
    expect(reply.body.data.content).toEqual([
      expect.objectContaining({ date: daysFromToday(10), reason: "Vesak Poya" }),
    ]);
  });
});

describe("SIG-05 Closed Date permissions", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = await addVenue(tenant);
  });

  it("manager_canCloseChangeAndReopenADate", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    const created = await call("POST", "/v1/closed-dates", asManager, {
      venueId,
      date: daysFromToday(5),
    });
    expect(created.status).toBe(201);
    const path = `/v1/closed-dates/${created.body.data.id}`;
    expect((await call("PATCH", path, asManager, { reason: "Poya" })).status).toBe(200);
    expect((await call("DELETE", path, asManager)).status).toBe(200);
  });

  it("frontDesk_canReadButNotClose", async () => {
    const asFrontDesk = asStaff(tenant, tenant.frontDesk);
    expect((await call("GET", "/v1/closed-dates", asFrontDesk)).status).toBe(200);
    const reply = await call("POST", "/v1/closed-dates", asFrontDesk, {
      venueId,
      date: daysFromToday(6),
    });
    expect(reply).toMatchObject({ status: 403, body: { code: "tt_htt_403" } });
  });

  it("customers_cannotOpenOneClosedDate", async () => {
    const created = await call("POST", "/v1/closed-dates", asStaff(tenant), {
      venueId,
      date: daysFromToday(7),
    });
    const reply = await call("GET", `/v1/closed-dates/${created.body.data.id}`, {
      tenantSlug: tenant.slug,
    });
    expect(reply.status).toBe(401);
  });
});
