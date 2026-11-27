import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, todayIn } from "../../lib/time";
import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  limitToVenues,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

const ALL_WEEK = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "18:00",
  closes: "21:00",
}));

describe("BKG-01 availability routes", () => {
  let tenant: TestTenant;
  let resourceId: number;
  let tableId: number;
  let otherVenueId: number;
  const date = addDays(todayIn("Asia/Colombo"), 2);
  const path = (query: object = { resourceId, date }) => {
    const pairs = Object.entries(query).map(([key, value]): [string, string] => [key, `${value}`]);
    return `/v1/availability?${new URLSearchParams(pairs)}`;
  };

  beforeAll(async () => {
    tenant = await createTenant();
    const venue = await call("POST", "/v1/venues", asStaff(tenant), {
      ...venueInput(),
      openingHours: ALL_WEEK,
    });
    resourceId = (
      await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venue.body.data.id))
    ).body.data.id;
    const otherVenue = await call("POST", "/v1/venues", asStaff(tenant), {
      ...venueInput(),
      openingHours: ALL_WEEK,
    });
    otherVenueId = otherVenue.body.data.id;
    const table = resourceInput(otherVenueId, { type: "POOL_TABLE" });
    tableId = (await call("POST", "/v1/resources", asStaff(tenant), table)).body.data.id;
  });

  const resourcesIn = (reply: { body: { data: { content: { resourceId: number }[] } } }) => [
    ...new Set(reply.body.data.content.map((slot) => slot.resourceId)),
  ];

  it("list_isOpenWithoutSignIn_andSendsTimesAsUtcText", async () => {
    const reply = await call("GET", path(), { tenantSlug: tenant.slug });
    expect(reply).toMatchObject({
      status: 200,
      body: { status: 200, message: "success", data: { totalElements: 5 } },
    });
    expect(reply.body.data.content[0]).toEqual({
      resourceId,
      startsAt: `${date}T12:30:00.000Z`,
      endsAt: `${date}T13:30:00.000Z`,
      price: { amount: 250_000, currency: "LKR" },
      free: true,
    });
  });

  it("list_isOpenToCustomersTheAssistantAndEveryStaffRole", async () => {
    const callers = [
      asCustomer(tenant, uniquePhone()),
      asAssistant(tenant, uniquePhone()),
      asStaff(tenant, tenant.frontDesk),
      asStaff(tenant, tenant.manager),
    ];
    for (const as of callers) expect((await call("GET", path(), as)).status).toBe(200);
  });

  it("list_needsARealDate_andRefusesBadFilters", async () => {
    const as = { tenantSlug: tenant.slug };
    const badQueries = [
      { resourceId },
      { resourceId, date: "2026-02-30" },
      { date, type: "TENNIS_COURT" },
      { date, free: "yes" },
      { date, from: "7pm" },
      { date, to: "25:00" },
    ];
    for (const query of badQueries) {
      const reply = await call("GET", path(query), as);
      expect(reply.status).toBe(400);
    }
  });

  it("list_withoutAResource_listsEveryResource_forEveryCaller", async () => {
    const callers = [
      { tenantSlug: tenant.slug },
      asCustomer(tenant, uniquePhone()),
      asAssistant(tenant, uniquePhone()),
      asStaff(tenant, tenant.frontDesk),
    ];
    for (const as of callers) {
      const reply = await call("GET", path({ date }), as);
      expect(reply.status).toBe(200);
      expect(resourcesIn(reply)).toEqual([resourceId, tableId]);
      expect(reply.body.data.totalElements).toBe(10);
    }
  });

  it("list_filtersByVenueTypeFreeAndTime", async () => {
    const as = asAssistant(tenant, uniquePhone());
    const query = { date, type: "POOL_TABLE", free: true, from: "19:00", to: "20:00" };
    const reply = await call("GET", path(query), as);
    expect(reply.body.data.content).toMatchObject([
      { resourceId: tableId, startsAt: `${date}T13:30:00.000Z`, free: true },
      { resourceId: tableId, startsAt: `${date}T14:00:00.000Z`, free: true },
    ]);
    const atVenue = await call("GET", path({ date, venueId: otherVenueId }), as);
    expect(resourcesIn(atVenue)).toEqual([tableId]);
  });

  it("list_staffLimitedToSomeVenues_seeOnlyThoseVenuesResources", async () => {
    const limited = await createTenant();
    const addResource = async () => {
      const venue = await call("POST", "/v1/venues", asStaff(limited), {
        ...venueInput(),
        openingHours: ALL_WEEK,
      });
      const resource = resourceInput(venue.body.data.id);
      return {
        venueId: venue.body.data.id as number,
        resourceId: (await call("POST", "/v1/resources", asStaff(limited), resource)).body.data
          .id as number,
      };
    };
    const mine = await addResource();
    const notMine = await addResource();
    await limitToVenues(limited, limited.manager, [mine.venueId]);
    const as = asStaff(limited, limited.manager);

    expect(resourcesIn(await call("GET", path({ date }), as))).toEqual([mine.resourceId]);
    const otherVenue = await call("GET", path({ date, venueId: notMine.venueId }), as);
    expect(otherVenue.body.data.content).toEqual([]);
    const otherResource = await call("GET", path({ date, resourceId: notMine.resourceId }), as);
    expect(otherResource).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    expect(resourcesIn(await call("GET", path({ date }), asStaff(limited)))).toHaveLength(2);
  });

  it("list_withSlots_quotesThatManyBackToBack_andRefusesABadCount", async () => {
    const as = { tenantSlug: tenant.slug };
    const reply = await call("GET", path({ resourceId, date, slots: 2 }), as);
    expect(reply.body.data.content[0]).toMatchObject({
      startsAt: `${date}T12:30:00.000Z`,
      endsAt: `${date}T14:30:00.000Z`,
      price: { amount: 500_000, currency: "LKR" },
    });
    for (const slots of [0, 1.5, "two"]) {
      expect((await call("GET", path({ resourceId, date, slots }), as)).status).toBe(400);
    }
  });

  it("list_repliesNotFoundForAResourceThatDoesNotExist", async () => {
    const reply = await call("GET", path({ resourceId: 999_999_999, date }), {
      tenantSlug: tenant.slug,
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("list_pagesAndSorts", async () => {
    const reply = await call(
      "GET",
      path({ resourceId, date, size: 2, page: 1, sort: "startsAt,desc" }),
      {
        tenantSlug: tenant.slug,
      },
    );
    expect(reply.body.data).toMatchObject({ page: 1, size: 2, totalElements: 5, totalPages: 3 });
    const starts = reply.body.data.content.map((slot: { startsAt: string }) => slot.startsAt);
    expect(starts).toEqual([`${date}T13:30:00.000Z`, `${date}T13:00:00.000Z`]);
  });
});
