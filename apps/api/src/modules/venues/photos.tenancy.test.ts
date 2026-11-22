import { beforeAll, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  uploadPhotoFile,
  venueInput,
} from "../../test/fixtures";

describe("Photos tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let venueOfB: number;
  let resourceOfB: number;
  let photoOfB: number;

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    venueOfB = (await call("POST", "/v1/venues", asStaff(tenantB), venueInput())).body.data.id;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venueOfB)))
      .body.data.id;
    const fileId = await uploadPhotoFile(asStaff(tenantB));
    photoOfB = (await call("POST", "/v1/photos", asStaff(tenantB), { fileId, venueId: venueOfB }))
      .body.data.id;
  });

  it("create_cannotAddAPhotoToAnotherTenantsVenueOrResource", async () => {
    const asA = asStaff(tenantA);
    const toVenue = await call("POST", "/v1/photos", asA, {
      fileId: await uploadPhotoFile(asA),
      venueId: venueOfB,
    });
    expect(toVenue).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
    const toResource = await call("POST", "/v1/photos", asA, {
      fileId: await uploadPhotoFile(asA),
      resourceId: resourceOfB,
    });
    expect(toResource).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("get_repliesNotFoundForAnotherTenantsPhoto", async () => {
    const reply = await call("GET", `/v1/photos/${photoOfB}`, asStaff(tenantA));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_011" } });
  });

  it("list_neverShowsAnotherTenantsPhotos", async () => {
    const asStaffOfA = await call("GET", `/v1/photos?venueId=${venueOfB}`, asStaff(tenantA));
    expect(asStaffOfA.body.data.content).toEqual([]);
    const onAsPortal = await call("GET", `/v1/photos?venueId=${venueOfB}`, {
      tenantSlug: tenantA.slug,
    });
    expect(onAsPortal.body.data.content).toEqual([]);
  });

  it("updateAndDelete_cannotTouchAnotherTenantsPhoto", async () => {
    const path = `/v1/photos/${photoOfB}`;
    expect((await call("PATCH", path, asStaff(tenantA), { position: 1 })).status).toBe(404);
    expect((await call("DELETE", path, asStaff(tenantA))).status).toBe(404);
    expect((await call("GET", path, asStaff(tenantB))).status).toBe(200);
  });
});
