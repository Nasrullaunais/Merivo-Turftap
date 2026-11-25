import { beforeAll, describe, expect, it } from "bun:test";

import { sql } from "drizzle-orm";

import { db } from "../../lib/db";
import { addDays, todayIn } from "../../lib/time";
import {
  createTenant,
  gymInput,
  planInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as membershipPlansService from "../memberships/membership-plans.service";
import * as membershipsService from "../memberships/memberships.service";
import * as venuesService from "./venues.service";

const FIRST_PAGE = { page: 0, size: 20, sort: { field: "name", direction: "asc" } } as const;

describe("VEN-01 venues", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("create_savesTheVenueForTheCallersTenant", async () => {
    const venue = await venuesService.create(tenant.owner.auth, venueInput({ name: "Kick Off" }));
    expect(venue).toMatchObject({
      name: "Kick Off",
      tenantId: tenant.id,
      timeZone: "Asia/Colombo",
      active: true,
    });
  });

  it("create_refusesANameAlreadyUsedIgnoringCase", async () => {
    await venuesService.create(tenant.owner.auth, venueInput({ name: "Goal Zone" }));
    const again = venuesService.create(tenant.owner.auth, venueInput({ name: "GOAL ZONE" }));
    await expect(again).rejects.toMatchObject({ status: 409, code: "tt_ven_002" });
  });

  it("create_allowsTheNameOfAVenueThatWasTurnedOff", async () => {
    const old = await venuesService.create(tenant.owner.auth, venueInput({ name: "Old Hall" }));
    await venuesService.remove(tenant.owner.auth, old.id);
    const reopened = await venuesService.create(
      tenant.owner.auth,
      venueInput({ name: "Old Hall" }),
    );
    expect(reopened.id).not.toBe(old.id);
  });

  it("update_withNullClearsAField", async () => {
    const venue = await venuesService.create(
      tenant.owner.auth,
      venueInput({ description: "Two courts" }),
    );
    const changed = await venuesService.update(tenant.owner.auth, venue.id, { description: null });
    expect(changed.description).toBeNull();
    expect(changed.name).toBe(venue.name);
  });

  it("get_hidesATurnedOffVenueFromCustomersButNotFromStaff", async () => {
    const venue = await venuesService.create(tenant.owner.auth, venueInput());
    await venuesService.remove(tenant.owner.auth, venue.id);
    expect((await venuesService.get(tenant.manager.auth, venue.id)).active).toBe(false);
    await expect(venuesService.get(tenant.publicAuth, venue.id)).rejects.toMatchObject({
      code: "tt_ven_001",
    });
  });

  it("list_showsOnlyOpenVenuesToSomeoneNotSignedIn", async () => {
    const page = await venuesService.list(tenant.publicAuth, {
      filters: { active: false },
      page: FIRST_PAGE,
    });
    expect(page.content.every((venue) => venue.active)).toBe(true);
  });
});

describe("VEN-08 gym", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  const turnGymOff = (venueId: number) =>
    venuesService.update(tenant.owner.auth, venueId, { hasGym: false });

  async function gymWithPlan() {
    const venue = await venuesService.create(tenant.owner.auth, gymInput());
    const plan = await membershipPlansService.create(tenant.manager.auth, planInput(venue.id));
    return { venueId: venue.id, planId: plan.id };
  }

  async function sell(planId: number) {
    return membershipsService.create(tenant.frontDesk.auth, {
      planId,
      walkIn: { customerName: "Nimal Perera", customerPhone: uniquePhone(), payment: "CASH" },
    });
  }

  it("create_startsWithoutAGym", async () => {
    const venue = await venuesService.create(tenant.owner.auth, venueInput());
    expect(venue.hasGym).toBe(false);
  });

  it("update_refusesTurningTheGymOffWhileAPlanIsOnSale", async () => {
    const { venueId } = await gymWithPlan();
    await expect(turnGymOff(venueId)).rejects.toMatchObject({ status: 409, code: "tt_ven_015" });
    expect((await venuesService.get(tenant.owner.auth, venueId)).hasGym).toBe(true);
  });

  it("update_refusesTurningTheGymOffWhileAMembershipIsNotOver", async () => {
    const { venueId, planId } = await gymWithPlan();
    await sell(planId);
    await membershipPlansService.remove(tenant.manager.auth, planId);
    await expect(turnGymOff(venueId)).rejects.toMatchObject({ code: "tt_ven_015" });
  });

  it("update_turnsTheGymOffOnceItsPlansAreOffAndItsMembershipsHaveEnded", async () => {
    const { venueId, planId } = await gymWithPlan();
    const membership = await sell(planId);
    await membershipPlansService.remove(tenant.manager.auth, planId);
    const yesterday = addDays(todayIn("Asia/Colombo"), -1);
    await db().execute(
      sql`update memberships set starts_on = ${addDays(yesterday, -30)}, ends_on = ${yesterday} where id = ${membership.id}`,
    );
    expect((await turnGymOff(venueId)).hasGym).toBe(false);
  });
});
