import { beforeAll, describe, expect, it } from "bun:test";

import {
  createTenant,
  priceRuleInput,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";
import * as priceRulesService from "./price-rules.service";
import * as resourcesService from "./resources.service";
import * as venuesService from "./venues.service";

const FIRST_PAGE = { page: 0, size: 100, sort: { field: "name", direction: "asc" } } as const;

describe("VEN-04 resources", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await venuesService.create(tenant.owner.auth, venueInput())).id;
  });

  it("create_savesTheResourceWithItsTypeAndSlotLength", async () => {
    const resource = await resourcesService.create(
      tenant.manager.auth,
      resourceInput(venueId, {
        name: "Pool Table 3",
        type: "POOL_TABLE",
        slotMinutes: 30,
        startIntervalMinutes: 15,
      }),
    );
    expect(resource).toMatchObject({
      venueId,
      tenantId: tenant.id,
      name: "Pool Table 3",
      type: "POOL_TABLE",
      slotMinutes: 30,
      startIntervalMinutes: 15,
      price: { amount: 250_000, currency: "LKR" },
      active: true,
    });
  });

  it("create_refusesAVenueThatDoesNotExist", async () => {
    const created = resourcesService.create(tenant.manager.auth, resourceInput(999_999_999));
    await expect(created).rejects.toMatchObject({ status: 404, code: "tt_ven_001" });
  });

  it("create_refusesANameAlreadyUsedAtTheVenueIgnoringCase", async () => {
    await resourcesService.create(tenant.manager.auth, resourceInput(venueId, { name: "Court 1" }));
    const again = resourcesService.create(
      tenant.manager.auth,
      resourceInput(venueId, { name: "COURT 1" }),
    );
    await expect(again).rejects.toMatchObject({ status: 409, code: "tt_ven_004" });
  });

  it("create_allowsTheSameNameAtAnotherVenue", async () => {
    const other = await venuesService.create(tenant.owner.auth, venueInput());
    await resourcesService.create(tenant.manager.auth, resourceInput(venueId, { name: "Court 7" }));
    const atOther = await resourcesService.create(
      tenant.manager.auth,
      resourceInput(other.id, { name: "Court 7" }),
    );
    expect(atOther.venueId).toBe(other.id);
  });

  it("turnedOff_isHiddenFromCustomersButKeptForStaff", async () => {
    const resource = await resourcesService.create(tenant.manager.auth, resourceInput(venueId));
    await resourcesService.remove(tenant.manager.auth, resource.id);

    const publicIds = (
      await resourcesService.list(tenant.publicAuth, {
        filters: { venueId, active: false },
        page: FIRST_PAGE,
      })
    ).content.map((row) => row.id);
    expect(publicIds).not.toContain(resource.id);
    await expect(resourcesService.get(tenant.publicAuth, resource.id)).rejects.toMatchObject({
      code: "tt_ven_003",
    });
    expect((await resourcesService.get(tenant.frontDesk.auth, resource.id)).active).toBe(false);
  });

  it("list_filtersByVenue", async () => {
    const other = await venuesService.create(tenant.owner.auth, venueInput());
    const there = await resourcesService.create(tenant.manager.auth, resourceInput(other.id));
    const page = await resourcesService.list(tenant.manager.auth, {
      filters: { venueId: other.id },
      page: FIRST_PAGE,
    });
    expect(page.content.map((row) => row.id)).toEqual([there.id]);
  });

  it("update_changesTheDefaultPrice", async () => {
    const resource = await resourcesService.create(tenant.manager.auth, resourceInput(venueId));
    const changed = await resourcesService.update(tenant.manager.auth, resource.id, {
      price: { amount: 300_000, currency: "LKR" },
    });
    expect(changed.price).toEqual({ amount: 300_000, currency: "LKR" });
    const saved = await resourcesService.get(tenant.publicAuth, resource.id);
    expect(saved).toMatchObject({ price: { amount: 300_000, currency: "LKR" }, slotMinutes: 60 });
  });

  it("update_changesTheSlotLength", async () => {
    const resource = await resourcesService.create(tenant.manager.auth, resourceInput(venueId));
    const changed = await resourcesService.update(tenant.manager.auth, resource.id, {
      slotMinutes: 30,
    });
    expect(changed).toMatchObject({
      slotMinutes: 30,
      startIntervalMinutes: 30,
      name: resource.name,
    });
  });

  it("update_refusesASlotShorterThanTheSavedStartInterval", async () => {
    const resource = await resourcesService.create(tenant.manager.auth, resourceInput(venueId));
    const shorter = resourcesService.update(tenant.manager.auth, resource.id, { slotMinutes: 15 });
    await expect(shorter).rejects.toMatchObject({
      status: 400,
      fieldErrors: [
        { field: "startIntervalMinutes", message: "Must not be longer than the slot length" },
      ],
    });
    expect((await resourcesService.get(tenant.manager.auth, resource.id)).slotMinutes).toBe(60);
  });
});

describe("VEN-05 Start Interval and Price Rules", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await venuesService.create(tenant.owner.auth, venueInput())).id;
  });
  const quarterHourCourt = () =>
    resourcesService.create(
      tenant.manager.auth,
      resourceInput(venueId, { startIntervalMinutes: 15 }),
    );

  it("update_refusesAStartIntervalThatAPriceRuleDoesNotFitAndNamesTheRule", async () => {
    const resource = await quarterHourCourt();
    await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resource.id, { weekdays: [6, 7], startTime: "18:15", endTime: "22:00" }),
    );
    const changed = resourcesService.update(tenant.manager.auth, resource.id, {
      startIntervalMinutes: 30,
    });
    await expect(changed).rejects.toMatchObject({
      status: 409,
      code: "tt_ven_013",
      message:
        "This Start Interval doesn't fit the Price Rule for Sat, Sun 18:15–22:00. Change or delete that rule first",
    });
    const saved = await resourcesService.get(tenant.manager.auth, resource.id);
    expect(saved.startIntervalMinutes).toBe(15);
  });

  it("update_changesTheStartIntervalWhenEveryPriceRuleFits", async () => {
    const resource = await quarterHourCourt();
    await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resource.id, { startTime: "18:00", endTime: "24:00" }),
    );
    const changed = await resourcesService.update(tenant.manager.auth, resource.id, {
      startIntervalMinutes: 60,
    });
    expect(changed.startIntervalMinutes).toBe(60);
  });

  it("update_neverLeavesAPriceRuleOffTheIntervalWhenBothAreSavedAtOnce", async () => {
    const resource = await quarterHourCourt();
    const results = await Promise.allSettled([
      resourcesService.update(tenant.manager.auth, resource.id, { startIntervalMinutes: 30 }),
      priceRulesService.create(
        tenant.manager.auth,
        priceRuleInput(resource.id, { startTime: "18:45", endTime: "22:00" }),
      ),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });
});
