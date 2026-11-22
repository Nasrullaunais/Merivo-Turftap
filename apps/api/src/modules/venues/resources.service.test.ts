import { beforeAll, describe, expect, it } from "bun:test";

import { createTenant, resourceInput, type TestTenant, venueInput } from "../../test/fixtures";
import * as resourcesService from "./resources.service";
import * as venuesService from "./venues.service";

const FIRST_PAGE = { page: 0, size: 100, sort: { field: "name", direction: "asc" } } as const;

describe("VEN-04 resources", () => {
  let tenant: TestTenant;
  let venueId: number;
  beforeAll(async () => {
    tenant = await createTenant();
    venueId = (await venuesService.create(tenant.owner.auth, venueInput())).id;
  });

  it("create_savesTheResourceWithItsTypeAndSlotLength", async () => {
    const resource = await resourcesService.create(
      tenant.manager.auth,
      resourceInput(venueId, { name: "Pool Table 3", type: "POOL_TABLE", slotMinutes: 30 }),
    );
    expect(resource).toMatchObject({
      venueId,
      tenantId: tenant.id,
      name: "Pool Table 3",
      type: "POOL_TABLE",
      slotMinutes: 30,
      active: true,
    });
  });

  it("create_refusesAVenueThatDoesNotExist", async () => {
    const created = resourcesService.create(tenant.manager.auth, resourceInput(999_999_999));
    await expect(created).rejects.toMatchObject({ status: 404, code: "tt_ven_001" });
  });

  it("create_refusesANameAlreadyUsedAtTheVenueIgnoringCase", async () => {
    await resourcesService.create(tenant.manager.auth, resourceInput(venueId, { name: "Court 1" }));
    const again = resourcesService.create(
      tenant.manager.auth,
      resourceInput(venueId, { name: "COURT 1" }),
    );
    await expect(again).rejects.toMatchObject({ status: 409, code: "tt_ven_004" });
  });

  it("create_allowsTheSameNameAtAnotherVenue", async () => {
    const other = await venuesService.create(tenant.owner.auth, venueInput());
    await resourcesService.create(tenant.manager.auth, resourceInput(venueId, { name: "Court 7" }));
    const atOther = await resourcesService.create(
      tenant.manager.auth,
      resourceInput(other.id, { name: "Court 7" }),
    );
    expect(atOther.venueId).toBe(other.id);
  });

  it("turnedOff_isHiddenFromCustomersButKeptForStaff", async () => {
    const resource = await resourcesService.create(tenant.manager.auth, resourceInput(venueId));
    await resourcesService.remove(tenant.manager.auth, resource.id);

    const publicIds = (
      await resourcesService.list(tenant.publicAuth, {
        filters: { venueId, active: false },
        page: FIRST_PAGE,
      })
    ).content.map((row) => row.id);
    expect(publicIds).not.toContain(resource.id);
    await expect(resourcesService.get(tenant.publicAuth, resource.id)).rejects.toMatchObject({
      code: "tt_ven_003",
    });
    expect((await resourcesService.get(tenant.frontDesk.auth, resource.id)).active).toBe(false);
  });

  it("list_filtersByVenue", async () => {
    const other = await venuesService.create(tenant.owner.auth, venueInput());
    const there = await resourcesService.create(tenant.manager.auth, resourceInput(other.id));
    const page = await resourcesService.list(tenant.manager.auth, {
      filters: { venueId: other.id },
      page: FIRST_PAGE,
    });
    expect(page.content.map((row) => row.id)).toEqual([there.id]);
  });

  it("update_changesTheSlotLength", async () => {
    const resource = await resourcesService.create(tenant.manager.auth, resourceInput(venueId));
    const changed = await resourcesService.update(tenant.manager.auth, resource.id, {
      slotMinutes: 90,
    });
    expect(changed).toMatchObject({ slotMinutes: 90, name: resource.name });
  });
});
