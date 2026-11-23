import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, todayIn } from "../../lib/time";
import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

describe("SIG-06 bookings for staff limited to some venues", () => {
  let tenant: TestTenant;
  let resourceA: number;
  let resourceB: number;
  const date = addDays(todayIn("Asia/Colombo"), 2);
  const availability = (resourceId: number) =>
    `/v1/availability?resourceId=${resourceId}&date=${date}`;

  beforeAll(async () => {
    tenant = await createTenant();
    const addResource = async () => {
      const venue = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data;
      return (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venue.id))).body
        .data.id as number;
    };
    resourceA = await addResource();
    resourceB = await addResource();
    const venueA = (await call("GET", `/v1/resources/${resourceA}`, asStaff(tenant))).body.data
      .venueId;
    await limitToVenues(tenant, tenant.manager, [venueA]);
  });

  it("availability_repliesNotFoundForAResourceAtAnotherVenue", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    expect((await call("GET", availability(resourceA), asManager)).status).toBe(200);
    const reply = await call("GET", availability(resourceB), asManager);
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("availability_customersStillSeeEveryVenue", async () => {
    const reply = await call("GET", availability(resourceB), { tenantSlug: tenant.slug });
    expect(reply.status).toBe(200);
  });
});
