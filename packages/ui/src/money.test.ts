import { describe, expect, it } from "vitest";

import { formatMoney, lkr, rupeesOf } from "./money";

describe("VEN-05 prices", () => {
  it("formatMoney_showsRupeesWithNoDecimalsAndNoLineBreak", () => {
    expect(formatMoney({ amount: 450_000, currency: "LKR" })).toBe("LKR\u00a04,500");
  });

  it("lkr_andRupeesOf_convertBetweenRupeesAndCents", () => {
    expect(lkr(4500)).toEqual({ amount: 450_000, currency: "LKR" });
    expect(rupeesOf({ amount: 60_000, currency: "LKR" })).toBe(600);
  });
});
