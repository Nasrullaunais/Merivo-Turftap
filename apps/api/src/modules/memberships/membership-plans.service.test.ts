import { beforeAll, describe, expect, it } from "bun:test";

import {
  createTenant,
  gymInput,
  planInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";
import * as venuesService from "../venues/venues.service";
import * as membershipPlansService from "./membership-plans.service";

const FIRST_PAGE = { page: 0, size: 100, sort: { field: "name", direction: "asc" } } as const;

describe("MEM-01 Membership Plans", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await venuesService.create(tenant.owner.auth, gymInput())).id;
  });

  it("create_savesTheNameLengthAndPrice", async () => {
    const plan = await membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { name: "Gym 10-day pass", lengthCount: 10, lengthUnit: "DAYS" }),
    );
    expect(plan).toMatchObject({
      venueId,
      tenantId: tenant.id,
      name: "Gym 10-day pass",
      lengthCount: 10,
      lengthUnit: "DAYS",
      price: { amount: 500_000, currency: "LKR" },
      active: true,
    });
    expect(await membershipPlansService.get(tenant.publicAuth, plan.id)).toMatchObject({
      name: "Gym 10-day pass",
    });
  });

  it("create_refusesAVenueThatDoesNotExist", async () => {
    const created = membershipPlansService.create(tenant.manager.auth, planInput(999_999_999));
    await expect(created).rejects.toMatchObject({ status: 404, code: "tt_ven_001" });
  });

  it("create_refusesAVenueWithoutAGym", async () => {
    const pool = await venuesService.create(tenant.owner.auth, venueInput({ name: "Cue Club" }));
    const created = membershipPlansService.create(tenant.manager.auth, planInput(pool.id));
    await expect(created).rejects.toMatchObject({ status: 409, code: "tt_mem_019" });
  });

  it("create_refusesANameAlreadyOnSaleAtTheVenueIgnoringCase", async () => {
    await membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { name: "Gym monthly" }),
    );
    const again = membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { name: "GYM MONTHLY" }),
    );
    await expect(again).rejects.toMatchObject({ status: 409, code: "tt_mem_002" });
  });

  it("create_allowsTheNameOfAPlanThatWasTurnedOff", async () => {
    const old = await membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { name: "Gym yearly" }),
    );
    await membershipPlansService.remove(tenant.manager.auth, old.id);
    const fresh = await membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { name: "Gym yearly", lengthCount: 12 }),
    );
    expect(fresh).toMatchObject({ name: "Gym yearly", active: true });
  });

  it("create_allowsTheSameNameAtAnotherVenue", async () => {
    const other = await venuesService.create(tenant.owner.auth, gymInput());
    await membershipPlansService.create(tenant.manager.auth, planInput(venueId, { name: "Gold" }));
    const atOther = await membershipPlansService.create(
      tenant.manager.auth,
      planInput(other.id, { name: "Gold" }),
    );
    expect(atOther.venueId).toBe(other.id);
  });

  it("turnedOff_isHiddenFromCustomersButKeptForStaff", async () => {
    const plan = await membershipPlansService.create(tenant.manager.auth, planInput(venueId));
    await membershipPlansService.remove(tenant.manager.auth, plan.id);

    const publicIds = (
      await membershipPlansService.list(tenant.publicAuth, {
        filters: { venueId, active: false },
        page: FIRST_PAGE,
      })
    ).content.map((row) => row.id);
    expect(publicIds).not.toContain(plan.id);
    await expect(membershipPlansService.get(tenant.publicAuth, plan.id)).rejects.toMatchObject({
      code: "tt_mem_001",
    });
    expect((await membershipPlansService.get(tenant.frontDesk.auth, plan.id)).active).toBe(false);
  });

  it("list_filtersByVenue", async () => {
    const other = await venuesService.create(tenant.owner.auth, gymInput());
    const there = await membershipPlansService.create(tenant.manager.auth, planInput(other.id));
    const page = await membershipPlansService.list(tenant.manager.auth, {
      filters: { venueId: other.id },
      page: FIRST_PAGE,
    });
    expect(page.content.map((row) => row.id)).toEqual([there.id]);
  });

  it("update_changesThePriceAndKeepsTheLength", async () => {
    const plan = await membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { lengthCount: 3 }),
    );
    await membershipPlansService.update(tenant.manager.auth, plan.id, {
      price: { amount: 1_200_000, currency: "LKR" },
    });
    expect(await membershipPlansService.get(tenant.publicAuth, plan.id)).toMatchObject({
      price: { amount: 1_200_000, currency: "LKR" },
      lengthCount: 3,
      lengthUnit: "MONTHS",
    });
  });

  it("update_refusesANameAnotherPlanOnSaleHas", async () => {
    await membershipPlansService.create(
      tenant.manager.auth,
      planInput(venueId, { name: "Silver" }),
    );
    const plan = await membershipPlansService.create(tenant.manager.auth, planInput(venueId));
    const renamed = membershipPlansService.update(tenant.manager.auth, plan.id, {
      name: "silver",
    });
    await expect(renamed).rejects.toMatchObject({ status: 409, code: "tt_mem_002" });
  });

  it("remove_refusesAPlanThatDoesNotExist", async () => {
    const removed = membershipPlansService.remove(tenant.manager.auth, 999_999_999);
    await expect(removed).rejects.toMatchObject({ status: 404, code: "tt_mem_001" });
  });
});
