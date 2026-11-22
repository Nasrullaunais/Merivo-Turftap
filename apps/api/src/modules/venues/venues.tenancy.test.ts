import { beforeAll, describe, expect, it } from "bun:test";

import { asStaff, call, createTenant, type TestTenant, venueInput } from "../../test/fixtures";

describe("venues tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let venueOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data.id;
  });

  it("get_repliesNotFoundForAnotherTenantsVenue", async () => {
    expect((await call("GET", `/v1/venues/${venueOfB}`, asStaff(tenantA))).status).toBe(404);
  });

  it("list_neverShowsAnotherTenantsVenues", async () => {
    const reply = await call("GET", "/v1/venues?size=100", asStaff(tenantA));
    expect(reply.body.data.content.map((venue: { id: number }) => venue.id)).not.toContain(
      venueOfB,
    );
  });

  it("update_cannotChangeAnotherTenantsVenue", async () => {
    const reply = await call("PATCH", `/v1/venues/${venueOfB}`, asStaff(tenantA), {
      name: "Taken over",
    });
    expect(reply.status).toBe(404);
    const stillB = await call("GET", `/v1/venues/${venueOfB}`, asStaff(tenantB));
    expect(stillB.body.data.name).not.toBe("Taken over");
  });

  it("delete_cannotTurnOffAnotherTenantsVenue", async () => {
    expect((await call("DELETE", `/v1/venues/${venueOfB}`, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", `/v1/venues/${venueOfB}`, asStaff(tenantB))).body.data.active).toBe(
      true,
    );
  });

  it("staffOfOneTenant_cannotPickAnotherTenant", async () => {
    const reply = await call("GET", "/v1/venues", {
      phone: tenantA.owner.phone,
      tenantId: tenantB.id,
    });
    expect(reply.status).toBe(403);
  });
});
