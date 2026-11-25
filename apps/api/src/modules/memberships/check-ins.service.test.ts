import { beforeAll, describe, expect, it } from "bun:test";

import type { CreateVenue, WalkIn } from "@turftap/contract";
import { sql } from "drizzle-orm";

import { db } from "../../lib/db";
import { addDays, todayIn } from "../../lib/time";
import {
  createTenant,
  planInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as customersService from "../customers/customers.service";
import * as paymentsService from "../payments/payments.service";
import * as venuesService from "../venues/venues.service";
import * as checkInsService from "./check-ins.service";
import * as membershipPlansService from "./membership-plans.service";
import * as membershipsService from "./memberships.service";

const TIME_ZONE = "Asia/Colombo";
const UNDO_MINUTES_PASSED = 6;
const rupees = (amount: number) => ({ amount: amount * 100, currency: "LKR" as const });
const today = () => todayIn(TIME_ZONE);
const inDays = (days: number) => addDays(today(), days);
const page = {
  page: 0,
  size: 50,
  sort: { field: "checkedInAt" as const, direction: "desc" as const },
};

describe("MEM-05 check-in", () => {
  let tenant: TestTenant;
  let venueId: number;
  let onceADayVenueId: number;
  const frontDesk = () => tenant.frontDesk.auth;

  beforeAll(async () => {
    tenant = await createTenant();
    const addVenue = async (overrides: Partial<CreateVenue> = {}) =>
      (await venuesService.create(tenant.owner.auth, venueInput(overrides))).id;
    venueId = await addVenue();
    onceADayVenueId = await addVenue({ repeatCheckIns: false });
  });

  async function sold(
    payment: WalkIn["payment"] = "CASH",
    { at = venueId, startsOn }: { at?: number; startsOn?: string } = {},
  ) {
    const plan = await membershipPlansService.create(
      tenant.manager.auth,
      planInput(at, { price: rupees(5_000) }),
    );
    return membershipsService.create(frontDesk(), {
      planId: plan.id,
      startsOn,
      walkIn: { customerName: "Nimal Perera", customerPhone: uniquePhone(), payment },
    });
  }

  const checkIn = (membershipId: number) => checkInsService.create(frontDesk(), { membershipId });
  const refusalOf = (membershipId: number) => checkIn(membershipId).catch((error) => error.code);

  const moveDays = (membershipId: number, startsOn: string, endsOn: string) =>
    db().execute(
      sql`update memberships set starts_on = ${startsOn}, ends_on = ${endsOn} where id = ${membershipId}`,
    );

  it("create_checksInAPaidActiveMembership_andListsItForToday", async () => {
    const membership = await sold();

    const checkedIn = await checkIn(membership.id);

    expect(checkedIn).toMatchObject({
      venueId,
      membershipId: membership.id,
      planName: membership.planName,
      customerId: membership.customerId,
      customerName: "Nimal Perera",
      customerPhone: membership.customerPhone,
      checkedInOn: today(),
      createdBy: tenant.frontDesk.userId,
    });
    const listed = await checkInsService.list(frontDesk(), {
      filters: { venueId, on: today() },
      page,
    });
    expect(listed.content.map((row) => row.id)).toContain(checkedIn.id);
    const yesterday = await checkInsService.list(frontDesk(), {
      filters: { venueId, on: inDays(-1) },
      page,
    });
    expect(yesterday.content).toEqual([]);
  });

  it("create_refusesAMembershipNotPaidYet", async () => {
    const phone = uniquePhone();
    const customer = await customersService.create(tenant.manager.auth, { name: "Kasun", phone });
    const plan = await membershipPlansService.create(tenant.manager.auth, planInput(venueId));
    const online = await membershipsService.create(
      { actor: "customer", tenantId: tenant.id, phone, customerId: customer.id },
      { planId: plan.id },
    );

    expect(await refusalOf(online.id)).toBe("tt_mem_011");
  });

  it("create_refusesWhileABalanceIsOwed_untilTheCashIsTaken", async () => {
    const membership = await sold("PAY_LATER");
    expect(await refusalOf(membership.id)).toBe("tt_mem_012");

    await paymentsService.create(frontDesk(), {
      kind: "CASH",
      membershipId: membership.id,
      amount: membership.balance,
      note: null,
    });

    expect((await checkIn(membership.id)).membershipId).toBe(membership.id);
  });

  it("create_refusesBeforeTheFirstDay_andSaysWhenItStarts", async () => {
    const membership = await sold("CASH", { startsOn: inDays(3) });

    const error = await checkIn(membership.id).catch((caught) => caught);

    expect(error.code).toBe("tt_mem_013");
    expect(error.message).toContain(new Date(`${inDays(3)}T00:00:00Z`).getUTCDate().toString());
  });

  it("create_refusesAfterTheLastDay_evenBeforeItIsMarkedEnded", async () => {
    const membership = await sold();
    await moveDays(membership.id, inDays(-30), inDays(-1));

    expect(await refusalOf(membership.id)).toBe("tt_mem_014");
  });

  it("create_refusesAMembershipMarkedEnded", async () => {
    const membership = await sold();
    await db().execute(sql`update memberships set status = 'ENDED' where id = ${membership.id}`);

    expect(await refusalOf(membership.id)).toBe("tt_mem_014");
  });

  it("create_refusesACancelledMembership", async () => {
    const membership = await sold();
    await membershipsService.update(frontDesk(), membership.id, {
      status: "CANCELLED",
      cancelReason: "Sold by mistake",
    });

    expect(await refusalOf(membership.id)).toBe("tt_mem_015");
  });

  it("create_refusedLeavesNoCheckIn", async () => {
    const membership = await sold("PAY_LATER");
    await refusalOf(membership.id);

    const listed = await checkInsService.list(frontDesk(), {
      filters: { membershipId: membership.id },
      page,
    });
    expect(listed.totalElements).toBe(0);
  });

  it("create_countsEveryVisitWhereTheVenueAllowsRepeats", async () => {
    const membership = await sold();

    await checkIn(membership.id);
    await checkIn(membership.id);

    const listed = await checkInsService.list(frontDesk(), {
      filters: { membershipId: membership.id, on: today() },
      page,
    });
    expect(listed.totalElements).toBe(2);
  });

  it("create_refusesASecondCheckInTheSameDay_whereTheVenueAllowsOne", async () => {
    const membership = await sold("CASH", { at: onceADayVenueId });
    await checkIn(membership.id);

    const error = await checkIn(membership.id).catch((caught) => caught);

    expect(error.code).toBe("tt_mem_016");
    expect(error.message).toMatch(/at \d\d:\d\d/);
  });

  it("create_twoTapsAtOnceCountOnce_whereTheVenueAllowsOne", async () => {
    const membership = await sold("CASH", { at: onceADayVenueId });

    const results = await Promise.allSettled([checkIn(membership.id), checkIn(membership.id)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });

  it("remove_undoesARecentCheckIn", async () => {
    const membership = await sold();
    const checkedIn = await checkIn(membership.id);

    await checkInsService.remove(frontDesk(), checkedIn.id);

    const listed = await checkInsService.list(frontDesk(), {
      filters: { membershipId: membership.id },
      page,
    });
    expect(listed.totalElements).toBe(0);
  });

  it("remove_refusesOnceTheUndoTimeHasPassed", async () => {
    const membership = await sold();
    const checkedIn = await checkIn(membership.id);
    await db().execute(
      sql`update check_ins set checked_in_at = now() - make_interval(mins => ${UNDO_MINUTES_PASSED}) where id = ${checkedIn.id}`,
    );

    const error = await checkInsService.remove(frontDesk(), checkedIn.id).catch((caught) => caught);

    expect(error.code).toBe("tt_mem_018");
    expect((await checkInsService.get(frontDesk(), checkedIn.id)).id).toBe(checkedIn.id);
  });

  it("remove_unknownCheckInIsNotFound", async () => {
    const error = await checkInsService.remove(frontDesk(), 999_999_999).catch((caught) => caught);

    expect(error.code).toBe("tt_mem_017");
  });
});
