import { beforeAll, beforeEach, describe, expect, it } from "bun:test";

import {
  asStaff,
  call,
  createTenant,
  limitToVenues,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

async function tenantWithTwoVenues() {
  const tenant = await createTenant();
  const addVenue = async () =>
    (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data.id as number;
  return { tenant, venueA: await addVenue(), venueB: await addVenue() };
}

describe("SIG-06 choose which venues staff work at", () => {
  let tenant: TestTenant;
  let venueA: number;
  let venueB: number;
  beforeEach(async () => {
    ({ tenant, venueA, venueB } = await tenantWithTwoVenues());
  });

  const add = (body: object) =>
    call("POST", "/v1/staff", asStaff(tenant), { phone: uniquePhone(), ...body });
  const patch = (id: number, body: object) =>
    call("PATCH", `/v1/staff/${id}`, asStaff(tenant), body);
  const fieldErrorOf = (reply: Awaited<ReturnType<typeof call>>) => ({
    status: reply.status,
    errors: reply.body.errors,
  });

  it("create_givesEveryVenueWhenNoneAreChosen", async () => {
    const reply = await add({ role: "MANAGER" });
    expect(reply.body.data).toMatchObject({ allVenues: true, venueIds: [] });
  });

  it("create_limitsSomeoneToTheChosenVenues", async () => {
    const reply = await add({ role: "FRONT_DESK", allVenues: false, venueIds: [venueB, venueB] });
    expect(reply.status).toBe(201);
    expect(reply.body.data).toMatchObject({ allVenues: false, venueIds: [venueB] });
    const stored = await call("GET", `/v1/staff/${reply.body.data.id}`, asStaff(tenant));
    expect(stored.body.data.venueIds).toEqual([venueB]);
  });

  it("create_refusesALimitWithNoVenues", async () => {
    expect(fieldErrorOf(await add({ role: "MANAGER", allVenues: false }))).toEqual({
      status: 400,
      errors: [{ field: "venueIds", message: "Pick at least one venue" }],
    });
  });

  it("create_refusesVenuesAlongsideEveryVenue", async () => {
    const reply = await add({ role: "MANAGER", allVenues: true, venueIds: [venueA] });
    expect(fieldErrorOf(reply)).toEqual({
      status: 400,
      errors: [{ field: "venueIds", message: "Leave this empty when allVenues is true" }],
    });
  });

  it("create_refusesLimitingAnOwner", async () => {
    const reply = await add({ role: "OWNER", allVenues: false, venueIds: [venueA] });
    expect(fieldErrorOf(reply)).toEqual({
      status: 400,
      errors: [{ field: "venueIds", message: "Owners always work at every venue" }],
    });
  });

  it("create_refusesAVenueThatDoesNotExist", async () => {
    const reply = await add({ role: "MANAGER", allVenues: false, venueIds: [999_999_999] });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_001" } });
  });

  it("update_changesWhichVenuesTheyWorkAt", async () => {
    const id = tenant.manager.staffId;
    await limitToVenues(tenant, tenant.manager, [venueA]);
    const reply = await patch(id, { venueIds: [venueA, venueB] });
    expect(reply.body.data).toMatchObject({ allVenues: false, venueIds: [venueA, venueB] });
  });

  it("update_backToEveryVenueClearsTheList", async () => {
    await limitToVenues(tenant, tenant.manager, [venueA]);
    const reply = await patch(tenant.manager.staffId, { allVenues: true });
    expect(reply.body.data).toMatchObject({ allVenues: true, venueIds: [] });
  });

  it("update_changingTheRoleKeepsTheirVenues", async () => {
    await limitToVenues(tenant, tenant.manager, [venueA]);
    const reply = await patch(tenant.manager.staffId, { role: "FRONT_DESK" });
    expect(reply.body.data).toMatchObject({ role: "FRONT_DESK", venueIds: [venueA] });
  });

  it("update_makingSomeoneAnOwnerGivesThemEveryVenue", async () => {
    await limitToVenues(tenant, tenant.manager, [venueA]);
    const reply = await patch(tenant.manager.staffId, { role: "OWNER" });
    expect(reply.body.data).toMatchObject({ role: "OWNER", allVenues: true, venueIds: [] });
    const venues = await call("GET", "/v1/venues", asStaff(tenant, tenant.manager));
    expect(venues.body.data.content).toHaveLength(2);
  });

  it("update_appliesOnTheirNextRequest", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    expect((await call("GET", `/v1/venues/${venueB}`, asManager)).status).toBe(200);
    await limitToVenues(tenant, tenant.manager, [venueA]);
    expect((await call("GET", `/v1/venues/${venueB}`, asManager)).status).toBe(404);
  });

  it("remove_worksForSomeoneLimitedToVenues", async () => {
    await limitToVenues(tenant, tenant.manager, [venueA]);
    const reply = await call("DELETE", `/v1/staff/${tenant.manager.staffId}`, asStaff(tenant));
    expect(reply.status).toBe(200);
  });
});

describe("SIG-06 a limited Manager's staff list", () => {
  let tenant: TestTenant;
  let venueA: number;
  let venueB: number;
  let atA: number;
  let atBoth: number;
  let atB: number;

  beforeAll(async () => {
    ({ tenant, venueA, venueB } = await tenantWithTwoVenues());
    const add = async (venueIds: number[]) =>
      (
        await call("POST", "/v1/staff", asStaff(tenant), {
          phone: uniquePhone(),
          role: "FRONT_DESK",
          allVenues: false,
          venueIds,
        })
      ).body.data.id as number;
    atA = await add([venueA]);
    atBoth = await add([venueA, venueB]);
    atB = await add([venueB]);
    await limitToVenues(tenant, tenant.manager, [venueA]);
  });

  it("list_showsStaffWhoShareAVenueAndStaffAtEveryVenue", async () => {
    const reply = await call("GET", "/v1/staff?size=100", asStaff(tenant, tenant.manager));
    const ids = reply.body.data.content.map((row: { id: number }) => row.id);
    expect(ids.toSorted()).toEqual(
      [
        tenant.owner.staffId,
        tenant.manager.staffId,
        tenant.frontDesk.staffId,
        atA,
        atBoth,
      ].toSorted(),
    );
  });

  it("get_hidesVenuesTheManagerDoesNotWorkAt", async () => {
    const reply = await call("GET", `/v1/staff/${atBoth}`, asStaff(tenant, tenant.manager));
    expect(reply.body.data.venueIds).toEqual([venueA]);
  });

  it("get_repliesNotFoundForStaffOnlyAtAnotherVenue", async () => {
    const reply = await call("GET", `/v1/staff/${atB}`, asStaff(tenant, tenant.manager));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_stf_001" } });
  });
});
