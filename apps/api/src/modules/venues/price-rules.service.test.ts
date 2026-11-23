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

const SAVES_AT_ONCE = 10;
const FIRST_PAGE = { page: 0, size: 100, sort: { field: "startTime", direction: "asc" } } as const;

describe("VEN-05 Price Rules", () => {
  let tenant: TestTenant;
  let venueId: number;
  const newResource = async () =>
    (await resourcesService.create(tenant.manager.auth, resourceInput(venueId))).id;

  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await venuesService.create(tenant.owner.auth, venueInput())).id;
  });

  it("create_savesWeekdaysHoursAndPrice", async () => {
    const resourceId = await newResource();
    const rule = await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resourceId, {
        weekdays: [7, 5, 6],
        startTime: "18:30",
        endTime: "24:00",
        price: { amount: 600_000, currency: "LKR" },
      }),
    );
    expect(rule).toMatchObject({
      resourceId,
      weekdays: [5, 6, 7],
      startTime: "18:30",
      endTime: "24:00",
      price: { amount: 600_000, currency: "LKR" },
    });
    expect(await priceRulesService.get(tenant.frontDesk.auth, rule.id)).toMatchObject(rule);
  });

  it("create_refusesAnOverlapAndNamesTheRuleItClashesWith", async () => {
    const resourceId = await newResource();
    await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resourceId, { weekdays: [6, 7], startTime: "18:00", endTime: "22:00" }),
    );
    const clash = priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resourceId, { weekdays: [5, 6], startTime: "21:00", endTime: "23:00" }),
    );
    await expect(clash).rejects.toMatchObject({
      status: 409,
      code: "tt_ven_006",
      message: "This overlaps the Price Rule for Sat, Sun 18:00–22:00",
    });
  });

  it("create_allowsRulesThatOnlyTouchOrUseOtherDaysOrAnotherResource", async () => {
    const resourceId = await newResource();
    const evenings = { weekdays: [6, 7], startTime: "18:00", endTime: "22:00" };
    await priceRulesService.create(tenant.manager.auth, priceRuleInput(resourceId, evenings));

    const late = { weekdays: [6], startTime: "22:00", endTime: "24:00" };
    const weekdays = { weekdays: [1, 2, 3, 4, 5], startTime: "18:00", endTime: "22:00" };
    for (const rule of [late, weekdays]) {
      await priceRulesService.create(tenant.manager.auth, priceRuleInput(resourceId, rule));
    }
    const other = await newResource();
    await priceRulesService.create(tenant.manager.auth, priceRuleInput(other, evenings));

    const page = await priceRulesService.list(tenant.manager.auth, {
      filters: { resourceId },
      page: FIRST_PAGE,
    });
    expect(page.totalElements).toBe(3);
  });

  it("create_savedAtTheSameTime_keepsOneAndNamesItToTheOthers", async () => {
    const resourceId = await newResource();
    const results = await Promise.allSettled(
      Array.from({ length: SAVES_AT_ONCE }, () =>
        priceRulesService.create(tenant.manager.auth, priceRuleInput(resourceId)),
      ),
    );
    const refused = results.filter((result) => result.status === "rejected");
    expect(refused).toHaveLength(SAVES_AT_ONCE - 1);
    for (const { reason } of refused)
      expect(reason).toMatchObject({
        status: 409,
        code: "tt_ven_006",
        message: "This overlaps the Price Rule for Sat, Sun 18:00–22:00",
      });
  });

  it("create_refusesTimesOffTheResourcesStartInterval", async () => {
    const resourceId = await newResource();
    const quarterPast = priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resourceId, { startTime: "18:15", endTime: "22:00" }),
    );
    await expect(quarterPast).rejects.toMatchObject({
      status: 400,
      fieldErrors: [
        {
          field: "startTime",
          message: "Must be on the resource's Start Interval, every 30 minutes",
        },
      ],
    });
  });

  it("create_allowsQuarterHoursOnA15MinuteStartInterval", async () => {
    const { id } = await resourcesService.create(
      tenant.manager.auth,
      resourceInput(venueId, { startIntervalMinutes: 15 }),
    );
    const rule = await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(id, { startTime: "18:15", endTime: "21:45" }),
    );
    expect(rule).toMatchObject({ startTime: "18:15", endTime: "21:45" });
  });

  it("create_refusesAResourceThatDoesNotExist", async () => {
    const created = priceRulesService.create(tenant.manager.auth, priceRuleInput(999_999_999));
    await expect(created).rejects.toMatchObject({ status: 404, code: "tt_ven_003" });
  });

  it("update_changesThePriceWithoutClashingWithItself", async () => {
    const rule = await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(await newResource()),
    );
    const changed = await priceRulesService.update(tenant.manager.auth, rule.id, {
      price: { amount: 450_000, currency: "LKR" },
    });
    expect(changed).toMatchObject({
      price: { amount: 450_000, currency: "LKR" },
      startTime: rule.startTime,
      weekdays: rule.weekdays,
    });
  });

  it("update_refusesMovingOntoAnotherRule", async () => {
    const resourceId = await newResource();
    await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resourceId, { weekdays: [6, 7], startTime: "18:00", endTime: "22:00" }),
    );
    const morning = await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(resourceId, { weekdays: [6, 7], startTime: "08:00", endTime: "12:00" }),
    );
    const moved = priceRulesService.update(tenant.manager.auth, morning.id, { endTime: "19:00" });
    await expect(moved).rejects.toMatchObject({ status: 409, code: "tt_ven_006" });
  });

  it("update_refusesAStartAfterTheSavedEnd", async () => {
    const rule = await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(await newResource(), { startTime: "18:00", endTime: "22:00" }),
    );
    const late = priceRulesService.update(tenant.manager.auth, rule.id, { startTime: "23:00" });
    await expect(late).rejects.toMatchObject({ status: 400, code: "tt_htt_400" });
  });

  it("update_refusesMovingTheEndOffTheStartInterval", async () => {
    const rule = await priceRulesService.create(
      tenant.manager.auth,
      priceRuleInput(await newResource()),
    );
    const moved = priceRulesService.update(tenant.manager.auth, rule.id, { endTime: "21:50" });
    await expect(moved).rejects.toMatchObject({
      status: 400,
      fieldErrors: [{ field: "endTime" }],
    });
  });

  it("remove_deletesTheRuleSoItsHoursCanBeReused", async () => {
    const resourceId = await newResource();
    const rule = await priceRulesService.create(tenant.manager.auth, priceRuleInput(resourceId));
    await priceRulesService.remove(tenant.manager.auth, rule.id);

    await expect(priceRulesService.get(tenant.manager.auth, rule.id)).rejects.toMatchObject({
      code: "tt_ven_005",
    });
    await priceRulesService.create(tenant.manager.auth, priceRuleInput(resourceId));
  });
});
