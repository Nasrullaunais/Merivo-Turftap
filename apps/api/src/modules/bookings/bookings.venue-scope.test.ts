import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
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

const TEN_O_CLOCK = 10 * 60;
const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opens: "06:00",
  closes: "23:00",
}));

describe("SIG-06 bookings for staff limited to some venues", () => {
  let tenant: TestTenant;
  let resourceA: number;
  let resourceB: number;
  let bookingA: number;
  let bookingB: number;
  const date = addDays(todayIn("Asia/Colombo"), 2);
  const availability = (resourceId: number) =>
    `/v1/availability?resourceId=${resourceId}&date=${date}`;

  beforeAll(async () => {
    tenant = await createTenant();
    const addResource = async () => {
      const venue = (
        await call("POST", "/v1/venues", asStaff(tenant), venueInput({ openingHours: openAllWeek }))
      ).body.data;
      return (await call("POST", "/v1/resources", asStaff(tenant), resourceInput(venue.id))).body
        .data.id as number;
    };
    resourceA = await addResource();
    resourceB = await addResource();
    const venueA = (await call("GET", `/v1/resources/${resourceA}`, asStaff(tenant))).body.data
      .venueId;
    await limitToVenues(tenant, tenant.manager, [venueA]);
    const book = async (resourceId: number) => {
      const phone = uniquePhone();
      await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
      const startsAt = instantAt(date, TEN_O_CLOCK, "Asia/Colombo").toISOString();
      const reply = await call("POST", "/v1/bookings", asCustomer(tenant, phone), {
        resourceId,
        startsAt,
      });
      return reply.body.data.id as number;
    };
    bookingA = await book(resourceA);
    bookingB = await book(resourceB);
  });

  it("bookings_listShowsOnlyTheirVenues", async () => {
    const reply = await call("GET", "/v1/bookings", asStaff(tenant, tenant.manager));
    expect(reply.body.data.content.map((booking: { id: number }) => booking.id)).toEqual([
      bookingA,
    ]);
    const owner = await call("GET", "/v1/bookings", asStaff(tenant));
    expect(owner.body.data.totalElements).toBe(2);
  });

  it("bookings_getRepliesNotFoundForAnotherVenuesBooking", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    expect((await call("GET", `/v1/bookings/${bookingA}`, asManager)).status).toBe(200);
    const reply = await call("GET", `/v1/bookings/${bookingB}`, asManager);
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
  });

  it("availability_repliesNotFoundForAResourceAtAnotherVenue", async () => {
    const asManager = asStaff(tenant, tenant.manager);
    expect((await call("GET", availability(resourceA), asManager)).status).toBe(200);
    const reply = await call("GET", availability(resourceB), asManager);
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("availability_customersStillSeeEveryVenue", async () => {
    const reply = await call("GET", availability(resourceB), { tenantSlug: tenant.slug });
    expect(reply.status).toBe(200);
  });
});
