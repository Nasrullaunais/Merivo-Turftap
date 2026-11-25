import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  planInput,
  type TestTenant,
  gymInput,
} from "../../test/fixtures";

const idsOf = (reply: { body: { data: { content: { id: number }[] } } }) =>
  reply.body.data.content.map((row) => row.id);

describe("SIG-06 Membership Plans for staff limited to some venues", () => {
  let tenant: TestTenant;
  let venueA: number;
  let venueB: number;
  let planA: number;
  let planB: number;
  const asManager = () => asStaff(tenant, tenant.manager);

  beforeAll(async () => {
    tenant = await createTenant();
    const addVenue = async () =>
      (await call("POST", "/v1/venues", asStaff(tenant), gymInput())).body.data.id as number;
    const addPlan = async (venueId: number) =>
      (await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venueId))).body.data
        .id as number;
    venueA = await addVenue();
    venueB = await addVenue();
    planA = await addPlan(venueA);
    planB = await addPlan(venueB);
    await limitToVenues(tenant, tenant.manager, [venueA]);
  });

  it("list_showsOnlyPlansAtTheirVenues", async () => {
    expect(idsOf(await call("GET", "/v1/membership-plans", asManager()))).toEqual([planA]);
    const reply = await call("GET", `/v1/membership-plans?venueId=${venueB}`, asManager());
    expect(idsOf(reply)).toEqual([]);
  });

  it("get_repliesNotFoundForAPlanAtAnotherVenue", async () => {
    const reply = await call("GET", `/v1/membership-plans/${planB}`, asManager());
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_mem_001" } });
  });

  it("create_cannotAddAPlanToAnotherVenue", async () => {
    const reply = await call("POST", "/v1/membership-plans", asManager(), planInput(venueB));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
  });

  it("update_cannotChangeAPlanAtAnotherVenue", async () => {
    const path = `/v1/membership-plans/${planB}`;
    expect((await call("PATCH", path, asManager(), { name: "Taken" })).status).toBe(404);
    expect((await call("GET", path, asStaff(tenant))).body.data.name).not.toBe("Taken");
  });

  it("delete_cannotTurnOffAPlanAtAnotherVenue", async () => {
    const path = `/v1/membership-plans/${planB}`;
    expect((await call("DELETE", path, asManager())).status).toBe(404);
    expect((await call("GET", path, asStaff(tenant))).body.data.active).toBe(true);
  });

  it("update_stillWorksAtTheirOwnVenue", async () => {
    const reply = await call("PATCH", `/v1/membership-plans/${planA}`, asManager(), {
      name: "Gym A",
    });
    expect(reply).toMatchObject({ status: 200, body: { data: { name: "Gym A" } } });
  });
});
