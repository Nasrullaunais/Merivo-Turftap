import { beforeAll, describe, expect, it } from "bun:test";

import { todayIn } from "../../lib/time";
import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  priceRuleInput,
  resourceInput,
  type TestTenant,
  uploadPhotoFile,
  venueInput,
} from "../../test/fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;
const nextWeek = () => todayIn("Asia/Colombo", new Date(Date.now() + 7 * DAY_MS));

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
  let closedA: number;
  let closedB: number;
  let blockA: number;
  let blockB: number;
  let venuePhotoA: number;
  let resourcePhotoA: number;
  let venuePhotoB: number;
  let resourcePhotoB: number;
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
    const addClosedDate = async (venueId: number) =>
      (await call("POST", "/v1/closed-dates", asStaff(tenant), { venueId, date: nextWeek() })).body
        .data.id as number;
    closedA = await addClosedDate(venueA);
    closedB = await addClosedDate(venueB);
    const addBlock = async (resourceId: number) =>
      (
        await call("POST", "/v1/blocked-times", asStaff(tenant), {
          resourceId,
          startsAt: new Date(Date.now() + 3 * DAY_MS).toISOString(),
          endsAt: new Date(Date.now() + 3 * DAY_MS + DAY_MS / 12).toISOString(),
        })
      ).body.data.id as number;
    blockA = await addBlock(resourceA);
    blockB = await addBlock(resourceB);
    const addPhoto = async (owner: object) =>
      (
        await call("POST", "/v1/photos", asStaff(tenant), {
          fileId: await uploadPhotoFile(asStaff(tenant)),
          ...owner,
        })
      ).body.data.id as number;
    venuePhotoA = await addPhoto({ venueId: venueA });
    resourcePhotoA = await addPhoto({ resourceId: resourceA });
    venuePhotoB = await addPhoto({ venueId: venueB });
    resourcePhotoB = await addPhoto({ resourceId: resourceB });
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

  describe("Closed Dates", () => {
    it("list_showsOnlyClosedDatesAtTheirVenues", async () => {
      expect(idsOf(await call("GET", "/v1/closed-dates", asManager()))).toEqual([closedA]);
    });

    it("get_repliesNotFoundForAnotherVenuesClosedDate", async () => {
      const reply = await call("GET", `/v1/closed-dates/${closedB}`, asManager());
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_007" } });
    });

    it("create_cannotCloseAnotherVenue", async () => {
      const reply = await call("POST", "/v1/closed-dates", asManager(), {
        venueId: venueB,
        date: todayIn("Asia/Colombo", new Date(Date.now() + 8 * DAY_MS)),
      });
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
    });

    it("updateAndDelete_cannotTouchAnotherVenuesClosedDate", async () => {
      const path = `/v1/closed-dates/${closedB}`;
      expect((await call("PATCH", path, asManager(), { reason: "Taken" })).status).toBe(404);
      expect((await call("DELETE", path, asManager())).status).toBe(404);
      expect((await call("GET", path, asStaff(tenant))).body.data.reason).toBeNull();
    });
  });

  describe("Blocked Times", () => {
    it("list_showsOnlyBlocksAtTheirVenues", async () => {
      expect(idsOf(await call("GET", "/v1/blocked-times", asManager()))).toEqual([blockA]);
    });

    it("get_repliesNotFoundForABlockAtAnotherVenue", async () => {
      const reply = await call("GET", `/v1/blocked-times/${blockB}`, asManager());
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_009" } });
    });

    it("create_cannotBlockAResourceAtAnotherVenue", async () => {
      const reply = await call("POST", "/v1/blocked-times", asManager(), {
        resourceId: resourceB,
        startsAt: new Date(Date.now() + 6 * DAY_MS).toISOString(),
        endsAt: new Date(Date.now() + 7 * DAY_MS).toISOString(),
      });
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    });

    it("updateAndDelete_cannotTouchABlockAtAnotherVenue", async () => {
      const path = `/v1/blocked-times/${blockB}`;
      expect((await call("PATCH", path, asManager(), { reason: "Taken" })).status).toBe(404);
      expect((await call("DELETE", path, asManager())).status).toBe(404);
      expect((await call("GET", path, asStaff(tenant))).body.data.reason).toBeNull();
    });
  });

  describe("Photos", () => {
    it("list_showsOnlyPhotosAtTheirVenues", async () => {
      const ids = idsOf(await call("GET", "/v1/photos", asManager()));
      expect(ids.sort()).toEqual([venuePhotoA, resourcePhotoA].sort());
    });

    it("get_repliesNotFoundForPhotosAtAnotherVenue", async () => {
      for (const id of [venuePhotoB, resourcePhotoB]) {
        const reply = await call("GET", `/v1/photos/${id}`, asManager());
        expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_011" } });
      }
    });

    it("create_cannotAddPhotosAtAnotherVenue", async () => {
      const toVenue = await call("POST", "/v1/photos", asManager(), {
        fileId: await uploadPhotoFile(asManager()),
        venueId: venueB,
      });
      expect(toVenue).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
      const toResource = await call("POST", "/v1/photos", asManager(), {
        fileId: await uploadPhotoFile(asManager()),
        resourceId: resourceB,
      });
      expect(toResource).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    });

    it("updateAndDelete_cannotTouchPhotosAtAnotherVenue", async () => {
      for (const id of [venuePhotoB, resourcePhotoB]) {
        const path = `/v1/photos/${id}`;
        expect((await call("PATCH", path, asManager(), { position: 9 })).status).toBe(404);
        expect((await call("DELETE", path, asManager())).status).toBe(404);
        expect((await call("GET", path, asStaff(tenant))).status).toBe(200);
      }
    });

    it("customers_stillSeePhotosAtEveryVenue", async () => {
      const reply = await call("GET", `/v1/photos?venueId=${venueB}`, { tenantSlug: tenant.slug });
      expect(idsOf(reply)).toEqual([venuePhotoB]);
    });
  });
});
