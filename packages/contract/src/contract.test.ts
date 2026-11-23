import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { PhoneInput, Timestamp } from "./common";
import { CreateResource, UpdateResource } from "./resources";
import { CreateVenue, UpdateVenue } from "./venues";

describe("SIG-01 phone numbers", () => {
  it.each(["0771234567", "077 123 4567", "+94 77 123 4567", "94771234567"])(
    "PhoneInput_stores %s as +94771234567",
    (typed) => {
      expect(PhoneInput.parse(typed)).toBe("+94771234567");
    },
  );

  it("PhoneInput_refusesSomethingThatIsNotAPhoneNumber", () => {
    expect(PhoneInput.safeParse("12345").success).toBe(false);
  });
});

describe("Timestamp", () => {
  it("decode_needsAZoneAndEncode_writesZ", () => {
    expect(Timestamp.safeParse("2026-12-01T13:30:00").success).toBe(false);
    const date = z.decode(Timestamp, "2026-12-01T13:30:00Z");
    expect(z.encode(Timestamp, date)).toBe("2026-12-01T13:30:00.000Z");
  });
});

describe("VEN-01 venue schemas", () => {
  const venue = {
    name: "Arena",
    address: "Colombo",
    phone: "0112345678",
    openingHours: [{ weekday: 1, opens: "06:00", closes: "24:00" }],
  };

  it("UpdateVenue_leavesOutFieldsThatWereNotSent", () => {
    expect(UpdateVenue.parse({})).toEqual({});
    expect(UpdateVenue.parse({ description: null })).toEqual({ description: null });
  });

  it("CreateVenue_refusesClosingBeforeOpening", () => {
    const late = { ...venue, openingHours: [{ weekday: 1, opens: "22:00", closes: "10:00" }] };
    expect(CreateVenue.safeParse(late).success).toBe(false);
  });

  it("CreateVenue_refusesTheSameWeekdayTwice", () => {
    const twice = { ...venue, openingHours: [venue.openingHours[0], venue.openingHours[0]] };
    expect(CreateVenue.safeParse(twice).success).toBe(false);
  });
});

describe("VEN-04 resource schemas", () => {
  const court = {
    venueId: 1,
    name: "Court 1",
    type: "FUTSAL_COURT",
    slotMinutes: 60,
    price: { amount: 450_000, currency: "LKR" },
  };
  const errorsOf = (result: { error?: z.ZodError }) =>
    result.error?.issues.map((issue) => ({ path: issue.path, message: issue.message }));

  it("CreateResource_startsBookingsEvery30MinutesUnlessTold", () => {
    expect(CreateResource.parse(court).startIntervalMinutes).toBe(30);
    expect(CreateResource.parse({ ...court, startIntervalMinutes: 60 }).startIntervalMinutes).toBe(
      60,
    );
  });

  it.each([45, 90, 20])("CreateResource_refusesA %i-minute slot", (slotMinutes) => {
    expect(CreateResource.safeParse({ ...court, slotMinutes }).success).toBe(false);
  });

  it("CreateResource_refusesAStartIntervalLongerThanTheSlot", () => {
    const result = CreateResource.safeParse({
      ...court,
      slotMinutes: 15,
      startIntervalMinutes: 30,
    });
    expect(errorsOf(result)).toEqual([
      { path: ["startIntervalMinutes"], message: "Must not be longer than the slot length" },
    ]);
  });

  it("UpdateResource_neverPicksUpTheDefaultStartInterval", () => {
    expect(UpdateResource.parse({ slotMinutes: 15 })).toEqual({ slotMinutes: 15 });
  });
});
