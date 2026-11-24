import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

const TIME_ZONE = "Asia/Colombo";
const SIX_PM = 18 * 60;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));

describe("repeat-series tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let resourceOfB: number;
  let seriesOfB: { id: number; customerId: number };
  const startsAt = instantAt(addDays(todayIn(TIME_ZONE), 2), SIX_PM, TIME_ZONE).toISOString();

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venue = (
      await call("POST", "/v1/venues", asStaff(tenantB), venueInput({ openingHours: openAllWeek }))
    ).body.data;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venue.id)))
      .body.data.id;
    seriesOfB = (
      await call("POST", "/v1/repeat-series", asStaff(tenantB), {
        resourceId: resourceOfB,
        startsAt,
        weeks: 3,
        customerName: "Nimal",
        customerPhone: uniquePhone(),
      })
    ).body.data;
  });

  it("repeatSeries_anotherTenantsSeriesIsNeverSeen", async () => {
    const reply = await call("GET", `/v1/repeat-series/${seriesOfB.id}`, asStaff(tenantA));
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_010" } });
    const list = await call(
      "GET",
      `/v1/repeat-series?customerId=${seriesOfB.customerId}`,
      asStaff(tenantA),
    );
    expect(list.body.data.content).toEqual([]);
  });

  it("cancel_cannotCancelAnotherTenantsSeries", async () => {
    const reply = await call("PATCH", `/v1/repeat-series/${seriesOfB.id}`, asStaff(tenantA), {
      status: "CANCELLED",
      cancelReason: "Rain",
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_010" } });
    const stillThere = await call("GET", `/v1/repeat-series/${seriesOfB.id}`, asStaff(tenantB));
    expect(stillThere.body.data.status).toBe("ACTIVE");
  });

  it("create_cannotBookAnotherTenantsResource", async () => {
    const reply = await call("POST", "/v1/repeat-series", asStaff(tenantA), {
      resourceId: resourceOfB,
      startsAt,
      weeks: 2,
      customerName: "Kasun",
      customerPhone: uniquePhone(),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });
});
