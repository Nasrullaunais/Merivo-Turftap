import { beforeAll, describe, expect, it } from "bun:test";

import { createTenant, type TestTenant, venueInput } from "../../test/fixtures";
import * as venuesService from "./venues.service";

const FIRST_PAGE = { page: 0, size: 20, sort: { field: "name", direction: "asc" } } as const;

describe("VEN-01 venues", () => {
  let tenant: TestTenant;
  beforeAll(async () => {
    tenant = await createTenant();
  });

  it("create_savesTheVenueForTheCallersTenant", async () => {
    const venue = await venuesService.create(tenant.owner.auth, venueInput({ name: "Kick Off" }));
    expect(venue).toMatchObject({
      name: "Kick Off",
      tenantId: tenant.id,
      timeZone: "Asia/Colombo",
      active: true,
    });
  });

  it("create_refusesANameAlreadyUsedIgnoringCase", async () => {
    await venuesService.create(tenant.owner.auth, venueInput({ name: "Goal Zone" }));
    const again = venuesService.create(tenant.owner.auth, venueInput({ name: "GOAL ZONE" }));
    await expect(again).rejects.toMatchObject({ status: 409, code: "tt_ven_002" });
  });

  it("create_allowsTheNameOfAVenueThatWasTurnedOff", async () => {
    const old = await venuesService.create(tenant.owner.auth, venueInput({ name: "Old Hall" }));
    await venuesService.remove(tenant.owner.auth, old.id);
    const reopened = await venuesService.create(
      tenant.owner.auth,
      venueInput({ name: "Old Hall" }),
    );
    expect(reopened.id).not.toBe(old.id);
  });

  it("update_withNullClearsAField", async () => {
    const venue = await venuesService.create(
      tenant.owner.auth,
      venueInput({ description: "Two courts" }),
    );
    const changed = await venuesService.update(tenant.owner.auth, venue.id, { description: null });
    expect(changed.description).toBeNull();
    expect(changed.name).toBe(venue.name);
  });

  it("get_hidesATurnedOffVenueFromCustomersButNotFromStaff", async () => {
    const venue = await venuesService.create(tenant.owner.auth, venueInput());
    await venuesService.remove(tenant.owner.auth, venue.id);
    expect((await venuesService.get(tenant.manager.auth, venue.id)).active).toBe(false);
    await expect(venuesService.get(tenant.publicAuth, venue.id)).rejects.toMatchObject({
      code: "tt_ven_001",
    });
  });

  it("list_showsOnlyOpenVenuesToSomeoneNotSignedIn", async () => {
    const page = await venuesService.list(tenant.publicAuth, {
      filters: { active: false },
      page: FIRST_PAGE,
    });
    expect(page.content.every((venue) => venue.active)).toBe(true);
  });
});
