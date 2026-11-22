import { describe, expect, it } from "vitest";

import { instantInZone } from "./time";

describe("VEN-07 times typed in the venue's time zone", () => {
  it("instantInZone_turnsColomboWallTimeIntoUtc", () => {
    expect(instantInZone("2026-12-25", "10:00", "Asia/Colombo").toISOString()).toBe(
      "2026-12-25T04:30:00.000Z",
    );
  });

  it("instantInZone_crossesMidnightBackToTheDayBefore", () => {
    expect(instantInZone("2026-12-25", "02:00", "Asia/Colombo").toISOString()).toBe(
      "2026-12-24T20:30:00.000Z",
    );
  });

  it("instantInZone_followsSummerTime", () => {
    expect(instantInZone("2026-07-01", "10:00", "Europe/London").toISOString()).toBe(
      "2026-07-01T09:00:00.000Z",
    );
    expect(instantInZone("2026-01-01", "10:00", "Europe/London").toISOString()).toBe(
      "2026-01-01T10:00:00.000Z",
    );
  });
});
