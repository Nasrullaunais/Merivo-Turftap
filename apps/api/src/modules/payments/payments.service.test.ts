import { beforeAll, describe, expect, it } from "bun:test";

import type { RecordPayment } from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  createTenant,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as bookingsService from "../bookings/bookings.service";
import * as customersService from "../customers/customers.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as paymentsService from "./payments.service";

const TIME_ZONE = "Asia/Colombo";
const TEN_O_CLOCK = 10 * 60;
const PRICE_RUPEES = 2_000;
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));

let tenant: TestTenant;
const frontDesk = () => tenant.frontDesk.auth;
const manager = () => tenant.manager.auth;

beforeAll(async () => {
  tenant = await createTenant();
});

/** A booking at 10:00 in two days, on a resource of its own priced at LKR 2,000. */
async function newBooking(venue: Parameters<typeof venueInput>[0] = { payAtVenue: true }) {
  const owner = tenant.owner.auth;
  const { id: venueId } = await venuesService.create(
    owner,
    venueInput({ openingHours: openAllWeek, ...venue }),
  );
  const resource = await resourcesService.create(
    owner,
    resourceInput(venueId, { price: rupees(PRICE_RUPEES) }),
  );
  const phone = uniquePhone();
  const customer = await customersService.create(owner, { name: "Nimal Perera", phone });
  const auth: AuthContext = {
    actor: "customer",
    tenantId: tenant.id,
    phone,
    customerId: customer.id,
  };
  const startsAt = instantAt(addDays(todayIn(TIME_ZONE), 2), TEN_O_CLOCK, TIME_ZONE);
  return bookingsService.create(auth, { resourceId: resource.id, startsAt, slots: 1 });
}

const record = (
  auth: AuthContext,
  bookingId: number,
  kind: RecordPayment["kind"],
  amountRupees: number,
  note: string | null = null,
) => paymentsService.create(auth, { bookingId, kind, amount: rupees(amountRupees), note });

const cancel = (bookingId: number) =>
  bookingsService.update(manager(), bookingId, { status: "CANCELLED", cancelReason: "Rain" });

const reload = (bookingId: number) => bookingsService.get(manager(), bookingId);

describe("PAY-08 pay the rest at the venue", () => {
  it("cash_forTheWholeBalance_showsTheBookingFullyPaid", async () => {
    const booking = await newBooking();
    expect(booking).toMatchObject({ paid: rupees(0), balance: rupees(PRICE_RUPEES) });

    const payment = await record(frontDesk(), booking.id, "CASH", PRICE_RUPEES);

    expect(payment).toMatchObject({
      bookingId: booking.id,
      venueId: booking.venueId,
      kind: "CASH",
      status: "ACCEPTED",
      amount: rupees(PRICE_RUPEES),
      createdBy: tenant.frontDesk.userId,
    });
    expect(await reload(booking.id)).toMatchObject({
      paid: rupees(PRICE_RUPEES),
      balance: rupees(0),
    });
  });

  it("cash_forPartOfTheBalance_leavesTheRest", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", 500);
    expect(await reload(booking.id)).toMatchObject({ paid: rupees(500), balance: rupees(1_500) });
  });

  it("cash_moreThanTheBalance_isRefusedAndNothingIsSaved", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", 500);
    await expect(record(frontDesk(), booking.id, "CASH", 1_501)).rejects.toMatchObject({
      code: "tt_pay_004",
    });
    expect(await reload(booking.id)).toMatchObject({ balance: rupees(1_500) });
  });

  it("cash_onAFullyPaidBooking_isRefused", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", PRICE_RUPEES);
    await expect(record(frontDesk(), booking.id, "CASH", 1)).rejects.toMatchObject({
      code: "tt_pay_003",
    });
  });

  it("cash_onABookingWaitingForPayment_isRefused", async () => {
    const booking = await newBooking({ payAtVenue: false });
    expect(booking.status).toBe("AWAITING_PAYMENT");
    await expect(record(frontDesk(), booking.id, "CASH", 500)).rejects.toMatchObject({
      code: "tt_pay_002",
    });
  });

  it("cash_onACancelledBooking_isRefused", async () => {
    const booking = await newBooking();
    await cancel(booking.id);
    await expect(record(frontDesk(), booking.id, "CASH", 500)).rejects.toMatchObject({
      code: "tt_pay_002",
    });
  });

  it("cash_manyAtOnce_onlyWhatFitsTheBalanceIsSaved", async () => {
    const PAYMENTS_AT_ONCE = 10;
    const CASH_RUPEES = 600;
    const booking = await newBooking();

    const results = await Promise.allSettled(
      Array.from({ length: PAYMENTS_AT_ONCE }, () =>
        record(frontDesk(), booking.id, "CASH", CASH_RUPEES),
      ),
    );

    const fits = Math.floor(PRICE_RUPEES / CASH_RUPEES);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(fits);
    for (const result of results.filter((result) => result.status === "rejected"))
      expect(result.reason).toMatchObject({ code: "tt_pay_004" });
    expect(await reload(booking.id)).toMatchObject({ paid: rupees(fits * CASH_RUPEES) });
  });
});

describe("BKG-08 record a refund", () => {
  it("refund_onACancelledBooking_isSavedAsNegativeAndLowersWhatWasPaid", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", PRICE_RUPEES);
    await cancel(booking.id);
    expect(await reload(booking.id)).toMatchObject({
      paid: rupees(PRICE_RUPEES),
      balance: rupees(0),
    });

    const refund = await record(manager(), booking.id, "REFUND", 1_500, "Rained out");

    expect(refund).toMatchObject({
      kind: "REFUND",
      status: "ACCEPTED",
      amount: rupees(-1_500),
      note: "Rained out",
      createdBy: tenant.manager.userId,
    });
    expect(await reload(booking.id)).toMatchObject({ paid: rupees(500), balance: rupees(0) });
  });

  it("refund_moreThanWasPaid_isRefused", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", 500);
    await cancel(booking.id);
    await record(manager(), booking.id, "REFUND", 300);
    await expect(record(manager(), booking.id, "REFUND", 201)).rejects.toMatchObject({
      code: "tt_pay_006",
    });
  });

  it("refund_whenNothingWasPaid_isRefused", async () => {
    const booking = await newBooking();
    await cancel(booking.id);
    await expect(record(manager(), booking.id, "REFUND", 1)).rejects.toMatchObject({
      code: "tt_pay_006",
    });
  });

  it("refund_onAConfirmedBooking_isRefused", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", PRICE_RUPEES);
    await expect(record(manager(), booking.id, "REFUND", 500)).rejects.toMatchObject({
      code: "tt_pay_005",
    });
  });

  it("refund_byFrontDesk_isRefused", async () => {
    const booking = await newBooking();
    await record(frontDesk(), booking.id, "CASH", PRICE_RUPEES);
    await cancel(booking.id);
    await expect(record(frontDesk(), booking.id, "REFUND", 500)).rejects.toMatchObject({
      status: 403,
      code: "tt_pay_007",
    });
    expect(await reload(booking.id)).toMatchObject({ paid: rupees(PRICE_RUPEES) });
  });
});
