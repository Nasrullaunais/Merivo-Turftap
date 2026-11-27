import { describe, expect, it } from "bun:test";

import { eq, sql } from "drizzle-orm";

import { config } from "../../lib/config";
import { db } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import { TURFTAP_NUMBER, WHATSAPP_TEMPLATES } from "../../ports/messaging-channel";
import {
  call,
  createTenant,
  messagesTo,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import { bookings } from "../bookings/bookings.tables";
import * as bookingsService from "../bookings/bookings.service";
import { sendOwnerWelcome } from "../staff/staff.jobs";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as tenantsService from "./tenants.service";

const TIME_ZONE = "Asia/Colombo";
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const MINUTES_PER_HOUR = 60;
const MS_PER_HOUR = 60 * 60 * 1000;

const newSlug = () => `kick-${crypto.randomUUID().slice(0, 8)}`;

async function runQueuedWelcome(tenantId: number) {
  const { rows } = await db().execute(
    sql`select data from pgboss.job where name = 'owner-welcome' and (data->>'tenantId')::int = ${tenantId}`,
  );
  expect(rows).toHaveLength(1);
  await sendOwnerWelcome(rows[0]!.data as { tenantId: number; staffId: number });
}

describe("PLA-01 create a tenant", () => {
  it("create_makesTheTenantWithThePhoneAsItsOwner", async () => {
    const ownerPhone = uniquePhone();
    const slug = newSlug();
    const tenant = await tenantsService.create({ slug, name: " Kick Off Arena ", ownerPhone });
    const me = await call("GET", "/v1/me", { phone: ownerPhone });
    expect(me.body.data.tenants).toEqual([
      expect.objectContaining({
        id: tenant.id,
        slug,
        name: "Kick Off Arena",
        active: true,
        role: "OWNER",
      }),
    ]);
  });

  it("create_welcomesTheOwnerOnWhatsAppFromTheTurfTapNumberWithTheConsoleLink", async () => {
    const ownerPhone = uniquePhone();
    const tenant = await tenantsService.create({
      slug: newSlug(),
      name: "Kick Off Arena",
      ownerPhone: `0${ownerPhone.slice("+94".length)}`,
    });
    await runQueuedWelcome(tenant.id);
    expect(messagesTo(ownerPhone)).toEqual([
      {
        kind: "template",
        from: TURFTAP_NUMBER,
        to: ownerPhone,
        template: WHATSAPP_TEMPLATES.ownerWelcome,
        values: ["Kick Off Arena", config.consoleUrl],
      },
    ]);
  });

  for (const slug of [
    "ab",
    "Kick-Off",
    "kick off",
    "-kick",
    "kick-",
    "kick--off",
    "k".repeat(31),
  ]) {
    it(`create_refusesTheBadSlug "${slug}"`, async () => {
      await expect(
        tenantsService.create({ slug, name: "Kick Off Arena", ownerPhone: uniquePhone() }),
      ).rejects.toMatchObject({
        status: 400,
        code: "tt_htt_400",
        fieldErrors: [expect.objectContaining({ field: "slug" })],
      });
    });
  }

  for (const slug of ["console", "api", "www"]) {
    it(`create_refusesTheServersOwnAddress "${slug}"`, async () => {
      await expect(
        tenantsService.create({ slug, name: "Kick Off Arena", ownerPhone: uniquePhone() }),
      ).rejects.toMatchObject({
        status: 400,
        fieldErrors: [{ field: "slug", message: "This web address is kept for TurfTap" }],
      });
    });
  }

  it("create_refusesASlugAnotherTenantHasAndSavesNothing", async () => {
    const slug = newSlug();
    await tenantsService.create({ slug, name: "Kick Off Arena", ownerPhone: uniquePhone() });
    const secondOwner = uniquePhone();
    await expect(
      tenantsService.create({ slug, name: "Other Arena", ownerPhone: secondOwner }),
    ).rejects.toMatchObject({
      status: 409,
      code: "tt_plt_011",
      message: "Another tenant already uses this web address",
    });
    const me = await call("GET", "/v1/me", { phone: secondOwner });
    expect(me.body.data.tenants).toEqual([]);
  });

  it("create_refusesAnOwnerPhoneThatIsNotANumber", async () => {
    await expect(
      tenantsService.create({ slug: newSlug(), name: "Kick Off Arena", ownerPhone: "12" }),
    ).rejects.toMatchObject({
      status: 400,
      fieldErrors: [expect.objectContaining({ field: "ownerPhone" })],
    });
  });
});

describe("PLA-03 turn a tenant off and on", () => {
  it("setActive_unknownSlug_isNotFound", async () => {
    await expect(tenantsService.setActive("no-such-tenant", false)).rejects.toMatchObject({
      status: 404,
      code: "tt_plt_001",
    });
  });
});

describe("PLA-04 list tenants", () => {
  /** A court open all day, so bookings can be moved to any time. */
  async function newCourt(tenant: TestTenant) {
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({
      weekday,
      opens: "00:00",
      closes: "24:00",
    }));
    const venue = await venuesService.create(tenant.owner.auth, venueInput({ openingHours }));
    const court = await resourcesService.create(
      tenant.owner.auth,
      resourceInput(venue.id, { slotMinutes: 60, startIntervalMinutes: 60 }),
    );
    return court.id;
  }

  /** A confirmed walk-in, then moved to `startsAt` and given `status` straight in the table. */
  async function bookingAt(
    tenant: TestTenant,
    resourceId: number,
    startsAt: Date,
    status?: "EXPIRED" | "CANCELLED",
  ) {
    const tomorrow = addDays(todayIn(TIME_ZONE), 1);
    const hour = (await db().$count(bookings, eq(bookings.tenantId, tenant.id))) + 1;
    const booking = await bookingsService.create(tenant.manager.auth, {
      resourceId,
      startsAt: instantAt(tomorrow, hour * MINUTES_PER_HOUR, TIME_ZONE),
      slots: 1,
      walkIn: { customerName: "Kasun Silva", customerPhone: uniquePhone(), payment: "PAY_LATER" },
    });
    await db()
      .update(bookings)
      .set({
        startsAt,
        endsAt: new Date(startsAt.getTime() + MS_PER_HOUR),
        ...(status && { status }),
      })
      .where(eq(bookings.id, booking.id));
  }

  it("list_countsBookingsStartingThisMonthOnSriLankanClocks_leavingOutExpiredAndCancelled", async () => {
    const tenant = await createTenant();
    const court = await newCourt(tenant);
    const now = new Date();
    const firstDay = `${todayIn(TIME_ZONE, now).slice(0, 8)}01`;
    const nextFirstDay = `${addDays(firstDay, 32).slice(0, 8)}01`;
    const sriLankaTime = (date: string, hour: number) =>
      instantAt(date, hour * MINUTES_PER_HOUR, TIME_ZONE);

    await bookingAt(tenant, court, sriLankaTime(firstDay, 0));
    await bookingAt(tenant, court, sriLankaTime(addDays(nextFirstDay, -1), 23));
    await bookingAt(tenant, court, sriLankaTime(addDays(firstDay, -1), 23));
    await bookingAt(tenant, court, sriLankaTime(nextFirstDay, 6));
    await bookingAt(tenant, court, sriLankaTime(firstDay, 10), "EXPIRED");
    await bookingAt(tenant, court, sriLankaTime(firstDay, 11), "CANCELLED");

    const listed = (await tenantsService.list(now)).find((row) => row.id === tenant.id);
    expect(listed).toMatchObject({ slug: tenant.slug, active: true, bookingsThisMonth: 2 });
  });

  it("list_showsATenantWithNoBookingsAndTurnedOff", async () => {
    const tenant = await createTenant();
    await tenantsService.setActive(tenant.slug, false);
    const listed = (await tenantsService.list()).find((row) => row.id === tenant.id);
    expect(listed).toMatchObject({ active: false, bookingsThisMonth: 0 });
  });
});

describe("Platform Admins", () => {
  it("addPlatformAdmin_letsSomeoneWhoNeverSignedInActAsOne", async () => {
    const phone = uniquePhone();
    await tenantsService.addPlatformAdmin(`0${phone.slice("+94".length)}`);
    const me = await call("GET", "/v1/me", { phone });
    expect(me.body.data.isPlatformAdmin).toBe(true);
  });

  it("addPlatformAdmin_refusesSomethingThatIsNotAPhone", async () => {
    await expect(tenantsService.addPlatformAdmin("not a phone")).rejects.toMatchObject({
      status: 400,
    });
  });
});
