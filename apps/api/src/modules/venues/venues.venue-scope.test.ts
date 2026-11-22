import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  priceRuleInput,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

const idsOf = (reply: { body: { data: { content: { id: number }[] } } }) =>
  reply.body.data.content.map((row) => row.id);

describe("SIG-06 staff limited to some venues", () => {
  let tenant: TestTenant;
  let venueA: number;
  let venueB: number;
  let resourceA: number;
  let resourceB: number;
  let ruleA: number;
  let ruleB: number;
  const asManager = () => asStaff(tenant, tenant.manager);

  beforeAll(async () => {
    tenant = await createTenant();
    const addVenue = async () =>
      (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id as number;
    const addResource = async (venueId: number) =>
      (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venueId))).body.data
        .id as number;
    const addRule = async (resourceId: number) =>
      (await call("POST", "/v1/price-rules", asStaff(tenant), priceRuleInput(resourceId))).body.data
        .id as number;
    venueA = await addVenue();
    venueB = await addVenue();
    resourceA = await addResource(venueA);
    resourceB = await addResource(venueB);
    ruleA = await addRule(resourceA);
    ruleB = await addRule(resourceB);
    await limitToVenues(tenant, tenant.manager, [venueA]);
    await limitToVenues(tenant, tenant.frontDesk, [venueB]);
  });

  describe("venues", () => {
    it("list_showsOnlyTheirVenues", async () => {
      expect(idsOf(await call("GET", "/v1/venues", asManager()))).toEqual([venueA]);
      const asFrontDesk = asStaff(tenant, tenant.frontDesk);
      expect(idsOf(await call("GET", "/v1/venues", asFrontDesk))).toEqual([venueB]);
    });

    it("get_repliesNotFoundForAnotherVenue", async () => {
      const reply = await call("GET", `/v1/venues/${venueB}`, asManager());
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
    });

    it("owner_alwaysSeesEveryVenue", async () => {
      const ids = idsOf(await call("GET", "/v1/venues", asStaff(tenant)));
      expect(ids).toEqual(expect.arrayContaining([venueA, venueB]));
    });

    it("customers_stillSeeEveryVenue", async () => {
      const ids = idsOf(await call("GET", "/v1/venues", { tenantSlug: tenant.slug }));
      expect(ids).toEqual(expect.arrayContaining([venueA, venueB]));
    });
  });

  describe("resources", () => {
    it("list_showsOnlyResourcesAtTheirVenues", async () => {
      expect(idsOf(await call("GET", "/v1/resources", asManager()))).toEqual([resourceA]);
      const reply = await call("GET", `/v1/resources?venueId=${venueB}`, asManager());
      expect(idsOf(reply)).toEqual([]);
    });

    it("get_repliesNotFoundForAResourceAtAnotherVenue", async () => {
      const reply = await call("GET", `/v1/resources/${resourceB}`, asManager());
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    });

    it("create_cannotAddAResourceToAnotherVenue", async () => {
      const reply = await call("POST", "/v1/resources", asManager(), resourceInput(venueB));
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
    });

    it("update_cannotChangeAResourceAtAnotherVenue", async () => {
      const path = `/v1/resources/${resourceB}`;
      expect((await call("PATCH", path, asManager(), { name: "Taken" })).status).toBe(404);
      expect((await call("GET", path, asStaff(tenant))).body.data.name).not.toBe("Taken");
    });

    it("delete_cannotTurnOffAResourceAtAnotherVenue", async () => {
      const path = `/v1/resources/${resourceB}`;
      expect((await call("DELETE", path, asManager())).status).toBe(404);
      expect((await call("GET", path, asStaff(tenant))).body.data.active).toBe(true);
    });

    it("update_stillWorksAtTheirOwnVenue", async () => {
      const path = `/v1/resources/${resourceA}`;
      const reply = await call("PATCH", path, asManager(), { name: "Court A" });
      expect(reply).toMatchObject({ status: 200, body: { data: { name: "Court A" } } });
    });
  });

  describe("Price Rules", () => {
    it("list_showsOnlyRulesAtTheirVenues", async () => {
      expect(idsOf(await call("GET", "/v1/price-rules", asManager()))).toEqual([ruleA]);
    });

    it("get_repliesNotFoundForARuleAtAnotherVenue", async () => {
      const reply = await call("GET", `/v1/price-rules/${ruleB}`, asManager());
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_005" } });
    });

    it("create_cannotAddARuleAtAnotherVenue", async () => {
      const input = priceRuleInput(resourceB, { weekdays: [1], startTime: "06:00" });
      const reply = await call("POST", "/v1/price-rules", asManager(), input);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    });

    it("update_cannotChangeARuleAtAnotherVenue", async () => {
      const path = `/v1/price-rules/${ruleB}`;
      expect((await call("PATCH", path, asManager(), { startTime: "17:00" })).status).toBe(404);
      expect((await call("GET", path, asStaff(tenant))).body.data.startTime).toBe("18:00");
    });

    it("delete_cannotRemoveARuleAtAnotherVenue", async () => {
      const path = `/v1/price-rules/${ruleB}`;
      expect((await call("DELETE", path, asManager())).status).toBe(404);
      expect((await call("GET", path, asStaff(tenant))).status).toBe(200);
    });
  });
});
