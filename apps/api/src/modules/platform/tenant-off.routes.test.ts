import { beforeAll, describe, expect, it } from "bun:test";

import {
  asAssistant,
  asStaff,
  call,
  createTenant,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";
import * as tenantsService from "./tenants.service";

const turnedOff = { status: 403, body: { code: "tt_plt_010" } };

describe("PLA-03 a tenant that is off", () => {
  let tenant: TestTenant;
  let venueId: number;
  let venueName: string;

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = (await call("POST", "/v1/venues", asStaff(tenant), venueInput())).body.data;
    venueId = venue.id;
    venueName = venue.name;
    await tenantsService.setActive(tenant.slug, false);
  });

  it("staff_changesAreRefused", async () => {
    const changes = [
      call("POST", "/v1/venues", asStaff(tenant), venueInput()),
      call("PATCH", `/v1/venues/${venueId}`, asStaff(tenant), { name: "Renamed" }),
      call("DELETE", `/v1/venues/${venueId}`, asStaff(tenant)),
    ];
    for (const reply of await Promise.all(changes)) expect(reply).toMatchObject(turnedOff);
    const venue = await call("GET", `/v1/venues/${venueId}`, asStaff(tenant));
    expect(venue.body.data.name).toBe(venueName);
  });

  it("staff_canStillLook", async () => {
    const reply = await call("GET", "/v1/venues", asStaff(tenant, tenant.frontDesk));
    expect(reply.status).toBe(200);
    expect(reply.body.data.content.map((venue: { id: number }) => venue.id)).toEqual([venueId]);
  });

  it("me_tellsStaffTheTenantIsOff", async () => {
    const reply = await call("GET", "/v1/me", { phone: tenant.manager.phone });
    expect(reply.body.data.tenants).toEqual([
      expect.objectContaining({ id: tenant.id, active: false }),
    ]);
  });

  it("assistant_isRefusedWithTheSameError", async () => {
    const reply = await call("GET", "/v1/venues", asAssistant(tenant, uniquePhone()));
    expect(reply).toMatchObject(turnedOff);
  });

  it("turnedBackOn_staffCanChangeThingsAgain", async () => {
    const other = await createTenant();
    await tenantsService.setActive(other.slug, false);
    await tenantsService.setActive(other.slug, true);
    const reply = await call("POST", "/v1/venues", asStaff(other), venueInput());
    expect(reply.status).toBe(201);
  });
});
