import { describe, expect, it } from "bun:test";

import { transitions } from "./transitions";

const bookingTransitions = transitions<"AWAITING_PAYMENT" | "CONFIRMED" | "CANCELLED">({
  AWAITING_PAYMENT: { CANCELLED: ["customer", "staff"] },
  CONFIRMED: { CANCELLED: ["staff"] },
});

describe("transitions", () => {
  it("check_allowsAListedChangeForAListedActor", () => {
    expect(() =>
      bookingTransitions.check("customer", "AWAITING_PAYMENT", "CANCELLED"),
    ).not.toThrow();
  });

  it("check_refusesAnActorWhoIsNotListed", () => {
    expect(() => bookingTransitions.check("customer", "CONFIRMED", "CANCELLED")).toThrow(
      expect.objectContaining({ status: 403 }),
    );
  });

  it("check_refusesAChangeThatIsNotListed", () => {
    expect(() => bookingTransitions.check("staff", "CANCELLED", "CONFIRMED")).toThrow(
      expect.objectContaining({ status: 409, code: "tt_sts_001" }),
    );
  });
});
