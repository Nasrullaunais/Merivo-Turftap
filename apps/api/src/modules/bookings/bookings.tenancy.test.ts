import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, todayIn } from "../../lib/time";
import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

describe("bookings tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let resourceOfB: number;
  const date = addDays(todayIn("Asia/Colombo"), 2);

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venue = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venue.id)))
      .body.data.id;
  });

  it("availability_repliesNotFoundForAnotherTenantsResource", async () => {
    const path = `/v1/availability?resourceId=${resourceOfB}&date=${date}`;
    for (const as of [asStaff(tenantA), { tenantSlug: tenantA.slug }]) {
      const reply = await call("GET", path, as);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    }
    expect((await call("GET", path, { tenantSlug: tenantB.slug })).status).toBe(200);
  });
});
