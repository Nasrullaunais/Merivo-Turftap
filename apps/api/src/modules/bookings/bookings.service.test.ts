import { beforeAll, describe, expect, it } from "bun:test";

import { minuteOfDay } from "@turftap/contract";
import { sql } from "drizzle-orm";

import type { AuthContext } from "../../lib/auth/context";
import { db } from "../../lib/db";
import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  createTenant,
  passTimeLimit,
  priceRuleInput,
  queuedMessagesFor,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as closedDatesService from "../venues/closed-dates.service";
import * as priceRulesService from "../venues/price-rules.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as bookingExpiryService from "./booking-expiry.service";
import * as bookingsRepository from "./bookings.repository";
import * as bookingsService from "./bookings.service";

const TIME_ZONE = "Asia/Colombo";
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const MS_PER_MINUTE = 60 * 1000;

const inDays = (days: number) => addDays(todayIn(TIME_ZONE), days);
const at = (date: string, time: string) => instantAt(date, minuteOfDay(time), TIME_ZONE);
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });
const bankAccount = {
  bankName: "Bank of Ceylon",
  branch: null,
  accountName: "Kick Off Arena (Pvt) Ltd",
  accountNumber: "0071 2345 678",
};

const expireJobsFor = async (bookingId: number) => {
  const { rows } = await db().execute(
    sql`select start_after from pgboss.job where name = 'expire-booking' and (data->>'bookingId')::int = ${bookingId}`,
  );
  return rows.map((row) => new Date(row.start_after as string));
};

describe("BKG-02 book online", () => {
  let tenant: TestTenant;
  const owner = () => tenant.owner.auth;

  beforeAll(async () => {
    tenant = await createTenant();
  });

  async function setUp(venue: Parameters<typeof venueInput>[0] = {}, priceRupees = 2_000) {
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({
      weekday,
      opens: "06:00",
      closes: "23:00",
    }));
    const { id: venueId } = await venuesService.create(
      owner(),
      venueInput({ openingHours, bankAccount, ...venue }),
    );
    const resource = await resourcesService.create(
      owner(),
      resourceInput(venueId, {
        slotMinutes: 60,
        startIntervalMinutes: 30,
        price: rupees(priceRupees),
      }),
    );
    return { venueId, resourceId: resource.id };
  }

  async function newCustomer(): Promise<AuthContext> {
    const phone = uniquePhone();
    const customer = await customersService.create(owner(), { name: "Nimal Perera", phone });
    return { actor: "customer", tenantId: tenant.id, phone, customerId: customer.id };
  }

  const book = async (resourceId: number, startsAt: Date, slots = 1, auth?: AuthContext) =>
    bookingsService.create(auth ?? (await newCustomer()), { resourceId, startsAt, slots });

  describe("price and amount due", () => {
    it("create_waitsForPaymentAndHoldsTheSlotsForThePaymentTimeLimit", async () => {
      const { venueId, resourceId } = await setUp({
        paymentTimeLimitMinutes: 20,
        cancellationCutOffHours: 12,
      });
      const before = Date.now();
      const booking = await book(resourceId, at(inDays(2), "18:00"), 2);
      expect(booking).toMatchObject({
        venueId,
        resourceId,
        status: "AWAITING_PAYMENT",
        source: "ONLINE",
        startsAt: at(inDays(2), "18:00"),
        endsAt: at(inDays(2), "20:00"),
        price: rupees(4_000),
        amountDue: rupees(4_000),
        cancellationCutOffHours: 12,
        bankAccount,
      });
      const holdMs = booking.expiresAt!.getTime() - before;
      expect(holdMs).toBeGreaterThanOrEqual(20 * MS_PER_MINUTE);
      expect(holdMs).toBeLessThan(21 * MS_PER_MINUTE);
      expect(await expireJobsFor(booking.id)).toEqual([booking.expiresAt!]);
    });

    it("create_pricesEachPartAtThePriceInForce_withAPriceRule", async () => {
      const { resourceId } = await setUp();
      const date = inDays(3);
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
      await priceRulesService.create(
        owner(),
        priceRuleInput(resourceId, { weekdays: [weekday], price: rupees(4_000) }),
      );
      const booking = await book(resourceId, at(date, "17:30"), 2);
      expect(booking.price).toEqual(rupees(1_000 + 3 * 2_000));
    });

    it("create_refusesAndBooksNothing_whenThePriceShownHasChanged", async () => {
      const { resourceId } = await setUp();
      const date = inDays(3);
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
      await priceRulesService.create(
        owner(),
        priceRuleInput(resourceId, { weekdays: [weekday], price: rupees(4_000) }),
      );
      const customer = await newCustomer();
      const startsAt = at(date, "18:00");
      await expect(
        bookingsService.create(customer, { resourceId, startsAt, slots: 1, price: rupees(2_000) }),
      ).rejects.toMatchObject({ code: "tt_bkg_012", message: expect.stringContaining("4,000") });
      expect(await book(resourceId, startsAt, 1, customer)).toMatchObject({ price: rupees(4_000) });
    });

    it("create_books_whenThePriceShownStillHolds", async () => {
      const { resourceId } = await setUp();
      const booking = await bookingsService.create(await newCustomer(), {
        resourceId,
        startsAt: at(inDays(2), "10:00"),
        slots: 2,
        price: rupees(4_000),
      });
      expect(booking).toMatchObject({ status: "AWAITING_PAYMENT", price: rupees(4_000) });
    });

    it("create_roundsTheAdvanceUpToWholeRupees", async () => {
      const { resourceId } = await setUp({ advancePercent: 33 }, 2_010);
      const booking = await book(resourceId, at(inDays(2), "10:00"));
      expect(booking).toMatchObject({ price: rupees(2_010), amountDue: rupees(664) });
    });

    it("create_atAPayAtVenueVenue_isConfirmedWithNothingDueOnline", async () => {
      const { resourceId } = await setUp({ payAtVenue: true });
      const booking = await book(resourceId, at(inDays(2), "10:00"));
      expect(booking).toMatchObject({
        status: "CONFIRMED",
        amountDue: rupees(0),
        expiresAt: null,
        bankAccount: null,
      });
      expect(await expireJobsFor(booking.id)).toEqual([]);
    });
  });

  describe("times that can't be booked", () => {
    it.each([
      ["off the Start Interval", "10:10"],
      ["after the last start time", "22:30"],
    ])("create_refusesAStart %s", async (_, time) => {
      const { resourceId } = await setUp();
      await expect(book(resourceId, at(inDays(2), time))).rejects.toMatchObject({
        code: "tt_bkg_004",
      });
    });

    it("create_refusesASlotInThePast", async () => {
      const { resourceId } = await setUp();
      await expect(book(resourceId, at(inDays(-1), "10:00"))).rejects.toMatchObject({
        code: "tt_bkg_004",
      });
    });

    it("create_refusesAClosedDate", async () => {
      const { venueId, resourceId } = await setUp();
      await closedDatesService.create(owner(), { venueId, date: inDays(4), reason: null });
      await expect(book(resourceId, at(inDays(4), "10:00"))).rejects.toMatchObject({
        code: "tt_bkg_004",
      });
    });

    it("create_refusesMoreThanThirtyDaysAhead", async () => {
      const { resourceId } = await setUp();
      await expect(book(resourceId, at(inDays(31), "10:00"))).rejects.toMatchObject({
        code: "tt_bkg_004",
      });
      expect(await book(resourceId, at(inDays(30), "10:00"))).toMatchObject({
        status: "AWAITING_PAYMENT",
      });
    });

    it("create_isToldTheSlotWasJustTaken_whenSomeoneElseHoldsIt", async () => {
      const { resourceId } = await setUp();
      await book(resourceId, at(inDays(2), "10:00"));
      await expect(book(resourceId, at(inDays(2), "10:30"))).rejects.toMatchObject({
        code: "tt_bkg_002",
      });
    });

    it("create_twoCustomersRacingForOneSlot_oneIsToldItWasJustTaken", async () => {
      const { resourceId } = await setUp();
      const [first, second] = [await newCustomer(), await newCustomer()];
      const startsAt = at(inDays(2), "12:00");
      const results = await Promise.allSettled([
        book(resourceId, startsAt, 1, first),
        book(resourceId, startsAt, 1, second),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.find((result) => result.status === "rejected")).toMatchObject({
        reason: {
          code: "tt_bkg_002",
          message: "That slot was just taken. Please pick another time",
        },
      });
    });
  });

  describe("D-07 one booking waiting for payment", () => {
    it("create_refusesASecondBookingWhileOneWaitsForPayment", async () => {
      const { resourceId } = await setUp();
      const customer = await newCustomer();
      await book(resourceId, at(inDays(2), "08:00"), 1, customer);
      await expect(book(resourceId, at(inDays(2), "14:00"), 1, customer)).rejects.toMatchObject({
        code: "tt_bkg_003",
      });
    });

    it("create_allowsAnotherOnceTheReceiptIsSent", async () => {
      const { resourceId } = await setUp();
      const customer = await newCustomer();
      const first = await book(resourceId, at(inDays(2), "08:00"), 1, customer);
      await bookingsRepository.setStatus(tenant.id, first.id, "AWAITING_PAYMENT", "AWAITING_CHECK");
      expect(await book(resourceId, at(inDays(2), "14:00"), 1, customer)).toMatchObject({
        status: "AWAITING_PAYMENT",
      });
    });

    it("create_atPayAtVenue_isNotLimitedByAWaitingBooking", async () => {
      const online = await setUp();
      const atVenue = await setUp({ payAtVenue: true });
      const customer = await newCustomer();
      await book(online.resourceId, at(inDays(2), "08:00"), 1, customer);
      expect(await book(atVenue.resourceId, at(inDays(2), "08:00"), 1, customer)).toMatchObject({
        status: "CONFIRMED",
      });
    });
  });

  describe("who books", () => {
    it("create_refusesACallerWithNoCustomerRecord", async () => {
      const { resourceId } = await setUp();
      const stranger: AuthContext = {
        actor: "customer",
        tenantId: tenant.id,
        phone: uniquePhone(),
      };
      await expect(book(resourceId, at(inDays(2), "10:00"), 1, stranger)).rejects.toMatchObject({
        code: "tt_bkg_005",
      });
    });

    it("create_staffWithoutWalkInDetails_isAskedForThem", async () => {
      const { resourceId } = await setUp();
      await expect(book(resourceId, at(inDays(2), "10:00"), 1, owner())).rejects.toMatchObject({
        code: "tt_bkg_008",
      });
    });

    it("create_customerSendingWalkInDetails_isRefused", async () => {
      const { resourceId } = await setUp();
      const walkIn = {
        customerName: "Kasun",
        customerPhone: uniquePhone(),
        payment: "CASH" as const,
      };
      await expect(
        bookingsService.create(await newCustomer(), {
          resourceId,
          startsAt: at(inDays(2), "10:00"),
          slots: 1,
          walkIn,
        }),
      ).rejects.toMatchObject({ code: "tt_htt_403" });
    });
  });
});

describe("BKG-04 walk-in booking", () => {
  let tenant: TestTenant;
  let resourceId: number;
  let venueId: number;
  const frontDesk = () => tenant.frontDesk.auth;

  beforeAll(async () => {
    tenant = await createTenant();
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({
      weekday,
      opens: "06:00",
      closes: "23:00",
    }));
    venueId = (
      await venuesService.create(tenant.owner.auth, venueInput({ openingHours, bankAccount }))
    ).id;
    resourceId = (
      await resourcesService.create(
        tenant.owner.auth,
        resourceInput(venueId, { slotMinutes: 60, startIntervalMinutes: 30, price: rupees(2_000) }),
      )
    ).id;
  });

  const walkIn = (
    startsAt: Date,
    payment: "CASH" | "PAY_LATER",
    customer: { customerName: string; customerPhone: string } = {
      customerName: "Kasun Silva",
      customerPhone: uniquePhone(),
    },
  ) =>
    bookingsService.create(frontDesk(), {
      resourceId,
      startsAt,
      slots: 2,
      walkIn: { ...customer, payment },
    });

  it("walkIn_paidInCash_isConfirmedAndFullyPaid", async () => {
    const booking = await walkIn(at(inDays(2), "18:00"), "CASH");
    const expected = {
      venueId,
      status: "CONFIRMED",
      source: "WALK_IN",
      price: rupees(4_000),
      amountDue: rupees(0),
      paid: rupees(4_000),
      balance: rupees(0),
      expiresAt: null,
      bankAccount: null,
    };
    expect(booking).toMatchObject(expected);
    expect(await bookingsService.get(frontDesk(), booking.id)).toMatchObject(expected);
    expect(await expireJobsFor(booking.id)).toEqual([]);
  });

  it("walkIn_payLater_owesTheFullPrice", async () => {
    const booking = await walkIn(at(inDays(2), "08:00"), "PAY_LATER");
    expect(booking).toMatchObject({
      status: "CONFIRMED",
      paid: rupees(0),
      balance: rupees(4_000),
      expiresAt: null,
    });
  });

  it("walkIn_knownPhone_reusesTheCustomerAndKeepsTheirName", async () => {
    const phone = uniquePhone();
    const known = await customersService.create(tenant.owner.auth, { name: "Nimal Perera", phone });
    const booking = await walkIn(at(inDays(3), "08:00"), "PAY_LATER", {
      customerName: "Nimal",
      customerPhone: phone,
    });
    expect(booking).toMatchObject({
      customerId: known.id,
      customerName: "Nimal Perera",
      customerPhone: phone,
    });
    expect(await customersService.get(tenant.owner.auth, known.id)).toMatchObject({
      name: "Nimal Perera",
    });
  });

  it("walkIn_newPhone_createsTheCustomer", async () => {
    const phone = uniquePhone();
    const booking = await walkIn(at(inDays(3), "12:00"), "CASH", {
      customerName: "Kasun Silva",
      customerPhone: phone,
    });
    const customer = await customersService.get(tenant.owner.auth, booking.customerId);
    expect(customer).toMatchObject({ name: "Kasun Silva", phone });
  });

  it("walkIn_slotHeldBySomeoneElse_isToldItWasJustTaken", async () => {
    await walkIn(at(inDays(4), "10:00"), "PAY_LATER");
    await expect(walkIn(at(inDays(4), "11:00"), "CASH")).rejects.toMatchObject({
      code: "tt_bkg_002",
      message: "That slot was just taken. Please pick another time",
    });
  });

  it("walkIn_moreThanThirtyDaysAhead_isAllowedForStaff", async () => {
    expect(await walkIn(at(inDays(45), "10:00"), "PAY_LATER")).toMatchObject({
      status: "CONFIRMED",
    });
  });

  it("walkIn_inThePast_isRefused", async () => {
    await expect(walkIn(at(inDays(-1), "10:00"), "CASH")).rejects.toMatchObject({
      code: "tt_bkg_004",
    });
  });
});

describe("BKG-03 bookings expire without payment", () => {
  let tenant: TestTenant;
  let resourceId: number;
  const date = inDays(2);

  beforeAll(async () => {
    tenant = await createTenant();
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({
      weekday,
      opens: "06:00",
      closes: "23:00",
    }));
    const venue = await venuesService.create(
      tenant.owner.auth,
      venueInput({ name: "Kick Off Arena", openingHours, bankAccount }),
    );
    resourceId = (
      await resourcesService.create(tenant.owner.auth, resourceInput(venue.id, { name: "Court 1" }))
    ).id;
  });

  async function bookAs(time: string) {
    const phone = uniquePhone();
    const customer = await customersService.create(tenant.owner.auth, { name: "Kamal", phone });
    const auth: AuthContext = { actor: "customer", tenantId: tenant.id, customerId: customer.id };
    const booking = await bookingsService.create(auth, {
      resourceId,
      startsAt: at(date, time),
      slots: 1,
    });
    return { booking, customerId: customer.id };
  }

  const statusOf = async (bookingId: number) =>
    (await bookingsService.get(tenant.owner.auth, bookingId)).status;

  it("expire_freesTheSlotAndTellsTheCustomer", async () => {
    const { booking, customerId } = await bookAs("09:00");
    await passTimeLimit(booking.id);
    await bookingExpiryService.expire(tenant.id, booking.id);
    expect(await statusOf(booking.id)).toBe("EXPIRED");
    expect(await queuedMessagesFor(customerId)).toEqual([
      {
        tenantId: tenant.id,
        customerId,
        template: "booking_expired",
        values: ["Kick Off Arena", "Court 1", expect.stringMatching(/ 09:00$/)],
      },
    ]);
    expect(await bookAs("09:00")).toMatchObject({ booking: { status: "AWAITING_PAYMENT" } });
  });

  it("expire_doesNothingIfTheReceiptArrivedFirst", async () => {
    const { booking, customerId } = await bookAs("11:00");
    await bookingsRepository.setStatus(tenant.id, booking.id, "AWAITING_PAYMENT", "AWAITING_CHECK");
    await passTimeLimit(booking.id);
    await bookingExpiryService.expire(tenant.id, booking.id);
    expect(await statusOf(booking.id)).toBe("AWAITING_CHECK");
    expect(await queuedMessagesFor(customerId)).toEqual([]);
  });

  it("expire_beforeTheTimeLimit_doesNothing", async () => {
    const { booking, customerId } = await bookAs("13:00");
    await bookingExpiryService.expire(tenant.id, booking.id);
    expect(await statusOf(booking.id)).toBe("AWAITING_PAYMENT");
    expect(await queuedMessagesFor(customerId)).toEqual([]);
  });
});

describe("BKG-06, BKG-07 cancel bookings", () => {
  let tenant: TestTenant;
  const frontDesk = () => tenant.frontDesk.auth;
  const date = inDays(2);
  let venueCount = 0;

  beforeAll(async () => {
    tenant = await createTenant();
  });

  /** Bookings two days ahead are 30 to 60 hours away: before a 12-hour cut-off, after a 72-hour one. */
  async function setUp(venue: Parameters<typeof venueInput>[0] = {}) {
    venueCount += 1;
    const openingHours = ALL_WEEKDAYS.map((weekday) => ({
      weekday,
      opens: "06:00",
      closes: "23:00",
    }));
    const created = await venuesService.create(
      tenant.owner.auth,
      venueInput({
        name: `Kick Off Arena ${venueCount}`,
        phone: "+94112345678",
        openingHours,
        bankAccount,
        ...venue,
      }),
    );
    const resource = await resourcesService.create(
      tenant.owner.auth,
      resourceInput(created.id, { name: "Court 1" }),
    );
    return resource.id;
  }

  async function newCustomer(): Promise<AuthContext & { customerId: number }> {
    const phone = uniquePhone();
    const customer = await customersService.create(tenant.owner.auth, { name: "Kamal", phone });
    return { actor: "customer", tenantId: tenant.id, phone, customerId: customer.id };
  }

  async function bookAs(customer: AuthContext, resourceId: number, time: string) {
    return bookingsService.create(customer, { resourceId, startsAt: at(date, time), slots: 1 });
  }

  const cancel = (auth: AuthContext, id: number, cancelReason?: string) =>
    bookingsService.update(auth, id, { status: "CANCELLED", cancelReason });

  it("cancel_customerBeforeTheCutOff_freesTheSlotWithoutAMessage", async () => {
    const resourceId = await setUp({ payAtVenue: true, cancellationCutOffHours: 12 });
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "10:00");
    expect(booking.status).toBe("CONFIRMED");

    expect(await cancel(customer, booking.id)).toMatchObject({
      status: "CANCELLED",
      cancelReason: null,
    });
    expect(await queuedMessagesFor(customer.customerId)).toEqual([]);
    expect(await bookAs(await newCustomer(), resourceId, "10:00")).toMatchObject({
      status: "CONFIRMED",
    });
  });

  it("cancel_customerAfterTheCutOff_isToldToCallTheVenue", async () => {
    const resourceId = await setUp({ payAtVenue: true, cancellationCutOffHours: 72 });
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "10:00");
    for (const auth of [customer, { ...customer, actor: "assistant" as const }]) {
      await expect(cancel(auth, booking.id)).rejects.toMatchObject({
        code: "tt_bkg_006",
        message: `It's too late to cancel online. Please call Kick Off Arena ${venueCount} on +94112345678`,
      });
    }
    expect((await bookingsService.get(customer, booking.id)).status).toBe("CONFIRMED");
  });

  it("cancel_bookingWaitingForPayment_customerCanCancelAfterTheCutOff", async () => {
    const resourceId = await setUp({ cancellationCutOffHours: 72 });
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "10:00");
    expect(booking.status).toBe("AWAITING_PAYMENT");

    expect(await cancel(customer, booking.id)).toMatchObject({
      status: "CANCELLED",
      bankAccount: null,
    });
    expect(await bookAs(customer, resourceId, "12:00")).toMatchObject({
      status: "AWAITING_PAYMENT",
    });
  });

  it("cancel_bookingWaitingForACheck_onlyStaffMayCancel", async () => {
    const resourceId = await setUp();
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "10:00");
    await bookingsRepository.setStatus(tenant.id, booking.id, "AWAITING_PAYMENT", "AWAITING_CHECK");
    await expect(cancel(customer, booking.id)).rejects.toMatchObject({ code: "tt_htt_403" });
    expect(await cancel(frontDesk(), booking.id, "Wrong court")).toMatchObject({
      status: "CANCELLED",
    });
  });

  it("cancel_frontDeskAfterTheCutOff_givesAReasonAndTheCustomerIsTold", async () => {
    const resourceId = await setUp({ payAtVenue: true, cancellationCutOffHours: 72 });
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "18:00");

    expect(await cancel(frontDesk(), booking.id, "Rain")).toMatchObject({
      status: "CANCELLED",
      cancelReason: "Rain",
    });
    expect(await queuedMessagesFor(customer.customerId)).toEqual([
      {
        tenantId: tenant.id,
        customerId: customer.customerId,
        template: "booking_cancelled",
        values: [
          `Kick Off Arena ${venueCount}`,
          "Court 1",
          expect.stringMatching(/ 18:00$/),
          "Rain",
        ],
      },
    ]);
  });

  it("cancel_staffWithoutAReason_isRefused", async () => {
    const resourceId = await setUp();
    const booking = await bookAs(await newCustomer(), resourceId, "10:00");
    await expect(cancel(frontDesk(), booking.id)).rejects.toMatchObject({
      status: 400,
      code: "tt_bkg_007",
    });
    expect((await bookingsService.get(frontDesk(), booking.id)).status).toBe("AWAITING_PAYMENT");
  });

  it("cancel_anAlreadyCancelledBooking_isRefused", async () => {
    const resourceId = await setUp();
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "10:00");
    await cancel(customer, booking.id);
    await expect(cancel(frontDesk(), booking.id, "Rain")).rejects.toMatchObject({
      code: "tt_sts_001",
    });
  });

  it("cancel_twoAtOnce_oneIsToldItChangedMeanwhile", async () => {
    const resourceId = await setUp({ payAtVenue: true });
    const customer = await newCustomer();
    const booking = await bookAs(customer, resourceId, "10:00");
    const results = await Promise.allSettled([
      cancel(customer, booking.id),
      cancel(frontDesk(), booking.id, "Rain"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "tt_sts_002" },
    });
  });

  it("cancel_anotherCustomersBooking_isNotFound", async () => {
    const resourceId = await setUp();
    const booking = await bookAs(await newCustomer(), resourceId, "10:00");
    await expect(cancel(await newCustomer(), booking.id)).rejects.toMatchObject({
      code: "tt_bkg_001",
    });
  });
});
