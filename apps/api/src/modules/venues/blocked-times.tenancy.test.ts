import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;
const window = (days: number) => ({
  startsAt: new Date(Date.now() + days * DAY_MS).toISOString(),
  endsAt: new Date(Date.now() + days * DAY_MS + DAY_MS / 12).toISOString(),
});

describe("Blocked Times tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let resourceOfB: number;
  let blockOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data
      .id;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venueOfB)))
      .body.data.id;
    blockOfB = (
      await call("POST", "/v1/blocked-times", asStaff(tenantB), {
        resourceId: resourceOfB,
        ...window(3),
      })
    ).body.data.id;
  });

  it("create_cannotBlockAnotherTenantsResource", async () => {
    const reply = await call("POST", "/v1/blocked-times", asStaff(tenantA), {
      resourceId: resourceOfB,
      ...window(5),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("get_repliesNotFoundForAnotherTenantsBlock", async () => {
    expect((await call("GET", `/v1/blocked-times/${blockOfB}`, asStaff(tenantA))).status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsBlocks", async () => {
    const reply = await call(
      "GET",
      `/v1/blocked-times?resourceId=${resourceOfB}`,
      asStaff(tenantA),
    );
    expect(reply.body.data.content).toEqual([]);
  });

  it("updateAndDelete_cannotTouchAnotherTenantsBlock", async () => {
    const path = `/v1/blocked-times/${blockOfB}`;
    expect((await call("PATCH", path, asStaff(tenantA), { reason: "Taken" })).status).toBe(404);
    expect((await call("DELETE", path, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.reason).toBeNull();
  });
});
