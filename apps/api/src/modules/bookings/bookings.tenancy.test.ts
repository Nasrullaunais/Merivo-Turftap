import { beforeAll, describe, expect, it } from "bun:test";

import { addDays, instantAt, todayIn } from "../../lib/time";
import {
  asAssistant,
  asCustomer,
  asStaff,
  call,
  createTenant,
  resourceInput,
  type TestTenant,
  uniquePhone,
  venueInput,
} from "../../test/fixtures";

const TEN_O_CLOCK = 10 * 60;

describe("bookings tenant isolation", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let resourceOfB: number;
  let bookingOfB: { id: number; customerId: number };
  const phone = uniquePhone();
  const date = addDays(todayIn("Asia/Colombo"), 2);
  const openAllWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    opens: "06:00",
    closes: "23:00",
  }));

  beforeAll(async () => {
    tenantA = await createTenant();
    tenantB = await createTenant();
    const venue = (
      await call("POST", "/v1/venues", asStaff(tenantB), venueInput({ openingHours: openAllWeek }))
    ).body.data;
    resourceOfB = (await call("POST", "/v1/resources", asStaff(tenantB), resourceInput(venue.id)))
      .body.data.id;
    // The same person is a customer of both tenants.
    for (const tenant of [tenantA, tenantB])
      await call("POST", "/v1/customers", asCustomer(tenant, phone), { name: "Nimal", phone });
    bookingOfB = (
      await call("POST", "/v1/bookings", asCustomer(tenantB, phone), {
        resourceId: resourceOfB,
        startsAt: instantAt(date, TEN_O_CLOCK, "Asia/Colombo").toISOString(),
      })
    ).body.data;
  });

  it("bookings_anotherTenantsBookingIsNeverSeen", async () => {
    for (const as of [asStaff(tenantA), asCustomer(tenantA, phone), asAssistant(tenantA, phone)]) {
      const reply = await call("GET", `/v1/bookings/${bookingOfB.id}`, as);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
      const list = await call("GET", `/v1/bookings?customerId=${bookingOfB.customerId}`, as);
      expect(list.body.data.content).toEqual([]);
    }
    expect(
      (await call("GET", "/v1/bookings", asCustomer(tenantB, phone))).body.data.content,
    ).toHaveLength(1);
  });

  it("cancel_cannotCancelAnotherTenantsBooking", async () => {
    const cancel = { status: "CANCELLED", cancelReason: "Rain" };
    for (const as of [asStaff(tenantA), asCustomer(tenantA, phone), asAssistant(tenantA, phone)]) {
      const reply = await call("PATCH", `/v1/bookings/${bookingOfB.id}`, as, cancel);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_bkg_001" } });
    }
    const stillThere = await call("GET", `/v1/bookings/${bookingOfB.id}`, asStaff(tenantB));
    expect(stillThere.body.data.status).toBe("AWAITING_PAYMENT");
  });

  it("create_cannotBookAnotherTenantsResource", async () => {
    const reply = await call("POST", "/v1/bookings", asCustomer(tenantA, phone), {
      resourceId: resourceOfB,
      startsAt: instantAt(date, TEN_O_CLOCK, "Asia/Colombo").toISOString(),
    });
    expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
  });

  it("availability_repliesNotFoundForAnotherTenantsResource", async () => {
    const path = `/v1/availability?resourceId=${resourceOfB}&date=${date}`;
    for (const as of [asStaff(tenantA), { tenantSlug: tenantA.slug }]) {
      const reply = await call("GET", path, as);
      expect(reply).toMatchObject({ status: 404, body: { code: "tt_ven_003" } });
    }
    expect((await call("GET", path, { tenantSlug: tenantB.slug })).status).toBe(200);
  });
});
