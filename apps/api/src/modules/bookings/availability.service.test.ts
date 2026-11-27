import { beforeAll, describe, expect, it } from "bun:test";

import {
  type AvailabilityFilters,
  type BookingStatus,
  minuteOfDay,
  type Slot,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import type { PageRequest } from "../../lib/db";
import { addDays, instantAt, todayIn, weekdayOf } from "../../lib/time";
import {
  createTenant,
  priceRuleInput,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as blockedTimesService from "../venues/blocked-times.service";
import * as closedDatesService from "../venues/closed-dates.service";
import * as priceRulesService from "../venues/price-rules.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as availabilityService from "./availability.service";
import * as bookingsRepository from "./bookings.repository";

const TIME_ZONE = "Asia/Colombo";
const WHOLE_DAY = { page: 0, size: 100, sort: { field: "startsAt", direction: "asc" } } as const;
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const inDays = (days: number) => addDays(todayIn(TIME_ZONE), days);
const at = (date: string, time: string) => instantAt(date, minuteOfDay(time), TIME_ZONE);
const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const startTimes = (slots: Slot[]) => slots.map((slot) => clock.format(slot.startsAt));
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });

type Setup = {
  opens?: string;
  closes?: string;
  weekdays?: number[];
  slotMinutes?: 15 | 30 | 60;
  startIntervalMinutes?: 15 | 30 | 60;
  priceRupees?: number;
};

describe("BKG-01 free slots", () => {
  let tenant: TestTenant;
  let customerId: number;
  const owner = () => tenant.owner.auth;

  beforeAll(async () => {
    tenant = await createTenant();
    customerId = (
      await customersService.create(owner(), { name: "Nimal Perera", phone: uniquePhone() })
    ).id;
  });

  async function setUp({
    opens = "06:00",
    closes = "23:00",
    weekdays = ALL_WEEKDAYS,
    slotMinutes = 60,
    startIntervalMinutes = 30,
    priceRupees = 2_000,
  }: Setup = {}) {
    const openingHours = weekdays.map((weekday) => ({ weekday, opens, closes }));
    const venue = await venuesService.create(owner(), venueInput({ openingHours }));
    const resource = await resourcesService.create(
      owner(),
      resourceInput(venue.id, { slotMinutes, startIntervalMinutes, price: rupees(priceRupees) }),
    );
    return { venueId: venue.id, resourceId: resource.id };
  }

  const slotsOn = async (
    resourceId: number,
    date: string,
    auth: AuthContext = tenant.publicAuth,
    slots?: number,
  ) =>
    (
      await availabilityService.list(auth, {
        filters: { resourceId, date, slots },
        page: WHOLE_DAY,
      })
    ).content;
  const freeTimes = (slots: Slot[]) => startTimes(slots.filter((slot) => slot.free));
  const priceAt = (slots: Slot[], time: string) =>
    slots.find((slot) => clock.format(slot.startsAt) === time)?.price;

  const book = async (resourceId: number, startsAt: Date, endsAt: Date, status: BookingStatus) =>
    bookingsRepository.insert(tenant.id, {
      venueId: (await resourcesService.get(owner(), resourceId)).venueId,
      resourceId,
      customerId,
      startsAt,
      endsAt,
      status,
      source: "WALK_IN",
      priceAmount: rupees(2_000).amount,
      priceCurrency: "LKR",
      amountDue: 0,
      cancellationCutOffHours: 6,
    });

  describe("start times", () => {
    it("list_startsOnTheStartIntervalAfterOpening_andEndsOneSlotBeforeClosing", async () => {
      const { resourceId } = await setUp({ opens: "06:15", closes: "09:00" });
      const slots = await slotsOn(resourceId, inDays(2));
      expect(startTimes(slots)).toEqual(["06:30", "07:00", "07:30", "08:00"]);
      expect(slots[0]!.endsAt).toEqual(at(inDays(2), "07:30"));
    });

    it("list_withAWholeHourStartInterval_startsOnlyOnTheHour", async () => {
      const { resourceId } = await setUp({
        opens: "06:15",
        closes: "09:00",
        startIntervalMinutes: 60,
      });
      expect(startTimes(await slotsOn(resourceId, inDays(2)))).toEqual(["07:00", "08:00"]);
    });

    it("list_withAQuarterHourStartInterval_startsEveryFifteenMinutes", async () => {
      const { resourceId } = await setUp({
        opens: "06:00",
        closes: "07:00",
        slotMinutes: 30,
        startIntervalMinutes: 15,
      });
      expect(startTimes(await slotsOn(resourceId, inDays(2)))).toEqual(["06:00", "06:15", "06:30"]);
    });

    it("list_isEmptyOnAWeekdayTheVenueDoesNotOpen", async () => {
      const date = inDays(2);
      const { resourceId } = await setUp({
        weekdays: ALL_WEEKDAYS.filter((day) => day !== weekdayOf(date)),
      });
      expect(await slotsOn(resourceId, date)).toEqual([]);
      expect((await slotsOn(resourceId, inDays(3))).length).toBeGreaterThan(0);
    });
  });

  describe("not free", () => {
    it("closedDate_noSlotIsFree", async () => {
      const { venueId, resourceId } = await setUp();
      await closedDatesService.create(owner(), { venueId, date: inDays(3), reason: "Vesak Poya" });
      const slots = await slotsOn(resourceId, inDays(3));
      expect(slots.length).toBeGreaterThan(0);
      expect(freeTimes(slots)).toEqual([]);
      expect(freeTimes(await slotsOn(resourceId, inDays(4))).length).toBe(slots.length);
    });

    it("blockedTime_takesOnlyTheSlotsItOverlaps", async () => {
      const { resourceId } = await setUp({ opens: "17:00", closes: "21:00" });
      const date = inDays(2);
      await blockedTimesService.create(owner(), {
        resourceId,
        startsAt: at(date, "18:00"),
        endsAt: at(date, "19:00"),
        reason: "Repairs",
      });
      expect(freeTimes(await slotsOn(resourceId, date))).toEqual([
        "17:00",
        "19:00",
        "19:30",
        "20:00",
      ]);
    });

    it("holdingBooking_takesItsSlots", async () => {
      const { resourceId } = await setUp({ opens: "17:00", closes: "21:00" });
      const date = inDays(2);
      await book(resourceId, at(date, "18:00"), at(date, "19:00"), "AWAITING_PAYMENT");
      await book(resourceId, at(date, "19:30"), at(date, "20:00"), "CONFIRMED");
      expect(freeTimes(await slotsOn(resourceId, date))).toEqual(["17:00", "20:00"]);
    });

    it("cancelledOrExpiredBooking_leavesItsSlotsFree", async () => {
      const { resourceId } = await setUp({ opens: "17:00", closes: "19:00" });
      const date = inDays(2);
      await book(resourceId, at(date, "17:00"), at(date, "18:00"), "CANCELLED");
      await book(resourceId, at(date, "18:00"), at(date, "19:00"), "EXPIRED");
      expect(freeTimes(await slotsOn(resourceId, date))).toEqual(["17:00", "17:30", "18:00"]);
    });

    it("slotInThePast_isNotFree", async () => {
      const { resourceId } = await setUp({ opens: "00:00", closes: "24:00" });
      const today = await slotsOn(resourceId, inDays(0));
      expect(today[0]!.free).toBe(false);
      const past = today.filter((slot) => slot.startsAt <= new Date());
      expect(past.every((slot) => !slot.free)).toBe(true);
      expect(today.filter((slot) => slot.startsAt > new Date()).every((slot) => slot.free)).toBe(
        true,
      );
      expect((await slotsOn(resourceId, inDays(1)))[0]!.free).toBe(true);
    });

    it("dateAfterTheBookingHorizon_hasNoFreeSlot", async () => {
      const { resourceId } = await setUp();
      expect(freeTimes(await slotsOn(resourceId, inDays(30))).length).toBeGreaterThan(0);
      expect(freeTimes(await slotsOn(resourceId, inDays(31)))).toEqual([]);
    });

    it("resourceTurnedOff_staffSeeNoFreeSlot_othersGetNotFound", async () => {
      const { resourceId } = await setUp();
      await resourcesService.remove(owner(), resourceId);
      const slots = await slotsOn(resourceId, inDays(2), owner());
      expect(slots.length).toBeGreaterThan(0);
      expect(freeTimes(slots)).toEqual([]);
      await expect(slotsOn(resourceId, inDays(2))).rejects.toMatchObject({
        status: 404,
        code: "tt_ven_003",
      });
    });

    it("venueTurnedOff_staffSeeNoFreeSlot_othersGetNotFound", async () => {
      const { venueId, resourceId } = await setUp();
      await venuesService.remove(owner(), venueId);
      expect(freeTimes(await slotsOn(resourceId, inDays(2), owner()))).toEqual([]);
      await expect(slotsOn(resourceId, inDays(2))).rejects.toMatchObject({
        status: 404,
        code: "tt_ven_001",
      });
    });
  });

  describe("D-05 prices", () => {
    it("price_isTheDefault_orThePriceRule_orEachHalfHoursShare", async () => {
      const { resourceId } = await setUp({ opens: "16:00", closes: "23:00" });
      await priceRulesService.create(
        owner(),
        priceRuleInput(resourceId, {
          weekdays: ALL_WEEKDAYS,
          startTime: "18:00",
          endTime: "22:00",
          price: rupees(3_000),
        }),
      );
      const slots = await slotsOn(resourceId, inDays(2));
      expect(priceAt(slots, "17:00")).toEqual(rupees(2_000));
      expect(priceAt(slots, "17:30")).toEqual(rupees(2_500));
      expect(priceAt(slots, "18:00")).toEqual(rupees(3_000));
      expect(priceAt(slots, "21:30")).toEqual(rupees(2_500));
      expect(priceAt(slots, "22:00")).toEqual(rupees(2_000));
    });

    it("price_ruleOnOtherWeekdays_doesNotApply", async () => {
      const { resourceId } = await setUp({ opens: "18:00", closes: "20:00" });
      const date = inDays(2);
      await priceRulesService.create(
        owner(),
        priceRuleInput(resourceId, {
          weekdays: ALL_WEEKDAYS.filter((day) => day !== weekdayOf(date)),
          startTime: "18:00",
          endTime: "20:00",
          price: rupees(3_000),
        }),
      );
      expect(priceAt(await slotsOn(resourceId, date), "18:00")).toEqual(rupees(2_000));
    });

    it("price_isRoundedToWholeRupees", async () => {
      const { resourceId } = await setUp({
        opens: "17:00",
        closes: "20:00",
        startIntervalMinutes: 15,
        priceRupees: 1_001,
      });
      await priceRulesService.create(
        owner(),
        priceRuleInput(resourceId, {
          weekdays: ALL_WEEKDAYS,
          startTime: "18:00",
          endTime: "20:00",
          price: rupees(1_000),
        }),
      );
      const slots = await slotsOn(resourceId, inDays(2));
      expect(priceAt(slots, "17:30")).toEqual(rupees(1_001)); // 1,000.50
      expect(priceAt(slots, "17:45")).toEqual(rupees(1_000)); // 1,000.25
    });
  });

  describe("BKG-04 several back-to-back slots", () => {
    it("slots_pricesAndChecksTheWholeLengthFromEachStart", async () => {
      const { resourceId } = await setUp({ opens: "16:00", closes: "20:00" });
      const date = inDays(2);
      await priceRulesService.create(
        owner(),
        priceRuleInput(resourceId, {
          weekdays: ALL_WEEKDAYS,
          startTime: "18:00",
          endTime: "20:00",
          price: rupees(3_000),
        }),
      );
      await book(resourceId, at(date, "19:00"), at(date, "20:00"), "CONFIRMED");

      const slots = await slotsOn(resourceId, date, tenant.publicAuth, 2);

      expect(startTimes(slots)).toEqual(["16:00", "16:30", "17:00", "17:30", "18:00"]);
      expect(slots[0]!.endsAt).toEqual(at(date, "18:00"));
      expect(freeTimes(slots)).toEqual(["16:00", "16:30", "17:00"]);
      expect(priceAt(slots, "16:00")).toEqual(rupees(4_000));
      expect(priceAt(slots, "17:00")).toEqual(rupees(5_000));
      expect(priceAt(slots, "17:30")).toEqual(rupees(5_500));
    });
  });

  describe("time zone", () => {
    it("date_isTheVenuesLocalDate_acrossUtcMidnight", async () => {
      const { resourceId } = await setUp({ opens: "00:00", closes: "24:00" });
      const date = inDays(3);
      const dayBefore = inDays(2);
      await book(
        resourceId,
        new Date(`${dayBefore}T19:00:00Z`),
        new Date(`${dayBefore}T20:00:00Z`),
        "CONFIRMED",
      );
      const slots = await slotsOn(resourceId, date);
      expect(slots[0]!.startsAt.toISOString()).toBe(`${dayBefore}T18:30:00.000Z`);
      expect(slots.at(-1)!.endsAt.toISOString()).toBe(`${date}T18:30:00.000Z`);
      expect(freeTimes(slots).slice(0, 2)).toEqual(["01:30", "02:00"]);
      expect((await slotsOn(resourceId, dayBefore)).at(-1)).toMatchObject({ free: true });
    });
  });
});

describe("BKG-01 free slots across resources", () => {
  const date = inDays(2);
  const hourly = { slotMinutes: 60, startIntervalMinutes: 60 } as const;
  const halfHourly = { slotMinutes: 30, startIntervalMinutes: 30 } as const;

  /** Two venues open 17:00 to 20:00: venue A has a court and a table, venue B a court. */
  async function setUp(opens = "17:00", closes = "20:00") {
    const tenant = await createTenant();
    const owner = tenant.owner.auth;
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({ weekday, opens, closes }));
    const venueA = (await venuesService.create(owner, venueInput({ openingHours }))).id;
    const venueB = (await venuesService.create(owner, venueInput({ openingHours }))).id;
    const add = async (venueId: number, overrides: Parameters<typeof resourceInput>[1]) =>
      (await resourcesService.create(owner, resourceInput(venueId, overrides))).id;
    const courtA = await add(venueA, hourly);
    const tableA = await add(venueA, { ...halfHourly, type: "TABLE_TENNIS_TABLE" });
    const courtB = await add(venueB, hourly);
    return { tenant, owner, venueA, venueB, courtA, tableA, courtB };
  }

  const slotsOf = async (
    auth: AuthContext,
    filters: Partial<AvailabilityFilters> = {},
    page: PageRequest<"startsAt"> = WHOLE_DAY,
  ) => availabilityService.list(auth, { filters: { date, ...filters }, page });
  const contentOf = async (...args: Parameters<typeof slotsOf>) => (await slotsOf(...args)).content;
  const startsBy = (slots: Slot[]) =>
    slots.map((slot) => `${clock.format(slot.startsAt)} ${slot.resourceId}`);
  const resourcesIn = (slots: Slot[]) => [...new Set(slots.map((slot) => slot.resourceId))].sort();

  it("noFilter_listsEveryResource_sortedByStartThenResource", async () => {
    const { tenant, courtA, tableA, courtB } = await setUp();
    expect(startsBy(await contentOf(tenant.publicAuth))).toEqual([
      `17:00 ${courtA}`,
      `17:00 ${tableA}`,
      `17:00 ${courtB}`,
      `17:30 ${tableA}`,
      `18:00 ${courtA}`,
      `18:00 ${tableA}`,
      `18:00 ${courtB}`,
      `18:30 ${tableA}`,
      `19:00 ${courtA}`,
      `19:00 ${tableA}`,
      `19:00 ${courtB}`,
      `19:30 ${tableA}`,
    ]);
  });

  it("venueAndType_narrowTheList", async () => {
    const { tenant, venueA, venueB, courtA, tableA, courtB } = await setUp();
    const as = tenant.publicAuth;
    expect(resourcesIn(await contentOf(as, { venueId: venueA }))).toEqual([courtA, tableA]);
    expect(resourcesIn(await contentOf(as, { type: "FUTSAL_COURT" }))).toEqual([courtA, courtB]);
    expect(resourcesIn(await contentOf(as, { venueId: venueB, type: "FUTSAL_COURT" }))).toEqual([
      courtB,
    ]);
    expect(await contentOf(as, { venueId: venueB, type: "TABLE_TENNIS_TABLE" })).toEqual([]);
  });

  it("free_dropsBookedAndBlockedSlots", async () => {
    const { tenant, owner, courtA, tableA, courtB } = await setUp();
    const customerId = (
      await customersService.create(owner, { name: "Nimal Perera", phone: uniquePhone() })
    ).id;
    await bookingsRepository.insert(tenant.id, {
      venueId: (await resourcesService.get(owner, courtA)).venueId,
      resourceId: courtA,
      customerId,
      startsAt: at(date, "17:00"),
      endsAt: at(date, "18:00"),
      status: "CONFIRMED",
      source: "WALK_IN",
      priceAmount: rupees(2_000).amount,
      priceCurrency: "LKR",
      amountDue: 0,
      cancellationCutOffHours: 6,
    });
    await blockedTimesService.create(owner, {
      resourceId: courtB,
      startsAt: at(date, "18:00"),
      endsAt: at(date, "19:00"),
      reason: "Repairs",
    });
    const freeOnes = await contentOf(tenant.publicAuth, { free: true, from: "17:00", to: "19:00" });
    expect(startsBy(freeOnes)).toEqual([
      `17:00 ${tableA}`,
      `17:00 ${courtB}`,
      `17:30 ${tableA}`,
      `18:00 ${courtA}`,
      `18:00 ${tableA}`,
      `18:30 ${tableA}`,
    ]);
    expect(freeOnes.every((slot) => slot.free)).toBe(true);
  });

  it("free_dropsSlotsInThePast", async () => {
    const { tenant } = await setUp("00:00", "24:00");
    const today = inDays(0);
    const all = await contentOf(tenant.publicAuth, { date: today }, { ...WHOLE_DAY, size: 1000 });
    const freeOnes = await contentOf(
      tenant.publicAuth,
      { date: today, free: true },
      { ...WHOLE_DAY, size: 1000 },
    );
    expect(freeOnes.length).toBeLessThan(all.length);
    expect(freeOnes.every((slot) => slot.startsAt > new Date())).toBe(true);
  });

  it("fromAndTo_keepSlotsStartingFromFromAndBeforeTo", async () => {
    const { tenant, courtA, tableA, courtB } = await setUp();
    expect(startsBy(await contentOf(tenant.publicAuth, { from: "18:00", to: "19:00" }))).toEqual([
      `18:00 ${courtA}`,
      `18:00 ${tableA}`,
      `18:00 ${courtB}`,
      `18:30 ${tableA}`,
    ]);
    expect(startsBy(await contentOf(tenant.publicAuth, { from: "19:30" }))).toEqual([
      `19:30 ${tableA}`,
    ]);
  });

  it("turnedOffResourceOrVenue_isLeftOut_evenForStaff", async () => {
    const { tenant, owner, venueB, courtA, tableA } = await setUp();
    await resourcesService.remove(owner, tableA);
    await venuesService.remove(owner, venueB);
    for (const as of [tenant.publicAuth, owner])
      expect(resourcesIn(await contentOf(as))).toEqual([courtA]);
  });

  it("resourceId_listsThatResourceAsBefore_withItsId", async () => {
    const { tenant, venueB, tableA } = await setUp();
    const slots = await contentOf(tenant.publicAuth, { resourceId: tableA });
    expect(startTimes(slots)).toEqual(["17:00", "17:30", "18:00", "18:30", "19:00", "19:30"]);
    expect(resourcesIn(slots)).toEqual([tableA]);
    expect(await contentOf(tenant.publicAuth, { resourceId: tableA, venueId: venueB })).toEqual([]);
    expect(
      await contentOf(tenant.publicAuth, { resourceId: tableA, type: "FUTSAL_COURT" }),
    ).toEqual([]);
  });

  it("slots_countsEachResourcesOwnSlotLength", async () => {
    const { tenant, venueA, courtA, tableA } = await setUp();
    const slots = await contentOf(tenant.publicAuth, { venueId: venueA, slots: 2 });
    const first = (resourceId: number) => slots.find((slot) => slot.resourceId === resourceId)!;
    expect(first(courtA).endsAt).toEqual(at(date, "19:00"));
    expect(first(tableA).endsAt).toEqual(at(date, "18:00"));
    expect(startsBy(slots).filter((start) => start.endsWith(` ${courtA}`))).toEqual([
      `17:00 ${courtA}`,
      `18:00 ${courtA}`,
    ]);
  });

  it("page_coversTheWholeCombinedList", async () => {
    const { tenant, courtA, tableA, courtB } = await setUp();
    const page = await slotsOf(tenant.publicAuth, {}, { ...WHOLE_DAY, size: 4, page: 1 });
    expect(page).toMatchObject({ page: 1, size: 4, totalElements: 12, totalPages: 3 });
    expect(startsBy(page.content)).toEqual([
      `18:00 ${courtA}`,
      `18:00 ${tableA}`,
      `18:00 ${courtB}`,
      `18:30 ${tableA}`,
    ]);
  });
});

describe("bookings_no_overlap", () => {
  let tenant: TestTenant;
  let venueId: number;
  let resourceId: number;
  let customerId: number;
  const date = inDays(5);

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = await venuesService.create(tenant.owner.auth, venueInput());
    venueId = venue.id;
    resourceId = (await resourcesService.create(tenant.owner.auth, resourceInput(venue.id))).id;
    customerId = (
      await customersService.create(tenant.owner.auth, {
        name: "Kamal Silva",
        phone: uniquePhone(),
      })
    ).id;
  });

  const book = (start: string, end: string, status: BookingStatus) =>
    bookingsRepository.insert(tenant.id, {
      venueId,
      resourceId,
      customerId,
      startsAt: at(date, start),
      endsAt: at(date, end),
      status,
      source: "ONLINE",
      priceAmount: rupees(2_000).amount,
      priceCurrency: "LKR",
      amountDue: rupees(2_000).amount,
      cancellationCutOffHours: 6,
    });

  it("database_refusesTwoHoldingBookingsThatOverlap", async () => {
    await book("10:00", "11:00", "CONFIRMED");
    await expect(book("10:30", "11:30", "AWAITING_PAYMENT")).rejects.toMatchObject({
      cause: { constraint: "bookings_no_overlap" },
    });
  });

  it("database_allowsOverlapWithACancelledBooking", async () => {
    await book("13:00", "14:00", "CANCELLED");
    expect(await book("13:30", "14:30", "AWAITING_CHECK")).toMatchObject({
      status: "AWAITING_CHECK",
    });
  });

  it("database_allowsBackToBackBookings", async () => {
    await book("15:00", "16:00", "CONFIRMED");
    expect(await book("16:00", "17:00", "CONFIRMED")).toMatchObject({ status: "CONFIRMED" });
  });
});
