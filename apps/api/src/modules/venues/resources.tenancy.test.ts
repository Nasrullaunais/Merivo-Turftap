import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  venueInput,
} from "../../test/fixtures";

describe("resources tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let venueOfB: number;
  let resourceOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data.id;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venueOfB)))
      .body.data.id;
  });

  it("create_cannotAddAResourceToAnotherTenantsVenue", async () => {
    const reply = await call("POST", "/v1/resources", asStaff(tenantA), resourceInput(venueOfB));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
  });

  it("get_repliesNotFoundForAnotherTenantsResource", async () => {
    expect((await call("GET", `/v1/resources/${resourceOfB}`, asStaff(tenantA))).status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsResources", async () => {
    const reply = await call("GET", `/v1/resources?venueId=${venueOfB}`, asStaff(tenantA));
    expect(reply.body.data.content).toEqual([]);
  });

  it("update_cannotChangeAnotherTenantsResource", async () => {
    const path = `/v1/resources/${resourceOfB}`;
    expect((await call("PATCH", path, asStaff(tenantA), { name: "Taken" })).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.name).not.toBe("Taken");
  });

  it("delete_cannotTurnOffAnotherTenantsResource", async () => {
    const path = `/v1/resources/${resourceOfB}`;
    expect((await call("DELETE", path, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).body.data.active).toBe(true);
  });
});
