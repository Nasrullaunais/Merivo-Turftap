import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  planInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

describe("SIG-06 check-ins for staff limited to some venues", () => {
  let tenant: TestTenant;
  let membershipA: number;
  let membershipB: number;
  let checkInB: number;

  beforeAll(async () => {
    tenant = await createTenant();
    const sellAtNewVenue = async () => {
      const venue = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data;
      const plan = (
        await call("POST", "/v1/membership-plans", asStaff(tenant), planInput(venue.id))
      ).body.data;
      const sold = await call("POST", "/v1/memberships", asStaff(tenant), {
        planId: plan.id,
        walkIn: { customerName: "Kasun", customerPhone: uniquePhone(), payment: "CASH" },
      });
      return { venueId: venue.id as number, membershipId: sold.body.data.id as number };
    };
    const a = await sellAtNewVenue();
    const b = await sellAtNewVenue();
    membershipA = a.membershipId;
    membershipB = b.membershipId;
    checkInB = (await call("POST", "/v1/check-ins", asStaff(tenant), { membershipId: membershipB }))
      .body.data.id;
    await limitToVenues(tenant, tenant.frontDesk, [a.venueId]);
  });

  const asFrontDesk = () => asStaff(tenant, tenant.frontDesk);

  it("create_onlyMembershipsAtTheirVenues", async () => {
    const own = await call("POST", "/v1/check-ins", asFrontDesk(), { membershipId: membershipA });
    expect(own.status).toBe(201);
    const other = await call("POST", "/v1/check-ins", asFrontDesk(), { membershipId: membershipB });
    expect(other).toMatchObject({ status: 404, body: { code: "tt_mem_003" } });
  });

  it("listGetAndDelete_onlyCheckInsAtTheirVenues", async () => {
    const listed = await call("GET", "/v1/check-ins", asFrontDesk());
    const ids = listed.body.data.content.map((row: { id: number }) => row.id);
    expect(ids).not.toContain(checkInB);
    expect(await call("GET", `/v1/check-ins/${checkInB}`, asFrontDesk())).toMatchObject({
      status: 404,
      body: { code: "tt_mem_017" },
    });
    expect(await call("DELETE", `/v1/check-ins/${checkInB}`, asFrontDesk())).toMatchObject({
      status: 404,
      body: { code: "tt_mem_017" },
    });
    expect((await call("GET", `/v1/check-ins/${checkInB}`, asStaff(tenant))).status).toBe(200);
  });
});
