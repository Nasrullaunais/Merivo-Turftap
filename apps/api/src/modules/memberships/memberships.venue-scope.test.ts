import { beforeAll, describe, expect, it } from "bun:test";

import {
  asCustomer,
  asStaff,
  call,
  createTenant,
  limitToVenues,
  planInput,
  type TestTenant,
  uniquePhone,
  gymInput,
} from "../../test/fixtures";

describe("SIG-06 memberships for staff limited to some venues", () => {
  let tenant: TestTenant;
  let planA: number;
  let planB: number;
  let membershipA: number;
  let membershipB: number;

  beforeAll(async () => {
    tenant = await createTenant();
    const addPlan = async () => {
      const venue = (await call("POST", "/v1/venues", asStaff(tenant), gymInput())).body.data;
      const plan = await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venue.id));
      return { venueId: venue.id as number, planId: plan.body.data.id as number };
    };
    const a = await addPlan();
    const b = await addPlan();
    planA = a.planId;
    planB = b.planId;
    await limitToVenues(tenant, tenant.manager, [a.venueId]);
    const buy = async (planId: number) => {
      const phone = uniquePhone();
      await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
      return (await call("POST", "/v1/memberships", asCustomer(tenant, phone), { planId })).body
        .data.id as number;
    };
    membershipA = await buy(planA);
    membershipB = await buy(planB);
  });

  const asManager = () => asStaff(tenant, tenant.manager);

  it("memberships_listShowsOnlyTheirVenues", async () => {
    const reply = await call("GET", "/v1/memberships", asManager());
    expect(reply.body.data.content.map((row: { id: number }) => row.id)).toEqual([membershipA]);
    const owner = await call("GET", "/v1/memberships", asStaff(tenant));
    expect(owner.body.data.totalElements).toBe(2);
  });

  it("memberships_getAndCancelReplyNotFoundAtAnotherVenue", async () => {
    expect((await call("GET", `/v1/memberships/${membershipA}`, asManager())).status).toBe(200);
    const seen = await call("GET", `/v1/memberships/${membershipB}`, asManager());
    expect(seen).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
    const cancelled = await call("PATCH", `/v1/memberships/${membershipB}`, asManager(), {
      status: "CANCELLED",
      cancelReason: "Mistake",
    });
    expect(cancelled).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
  });

  it("sell_onlyPlansAtTheirVenues", async () => {
    const sell = (planId: number) =>
      call("POST", "/v1/memberships", asManager(), {
        planId,
        walkIn: { customerName: "Kasun", customerPhone: uniquePhone(), payment: "CASH" },
      });
    expect((await sell(planA)).status).toBe(201);
    expect(await sell(planB)).toMatchObject({ status: 404, body: { code: "tt_mem_001" } });
  });
});
