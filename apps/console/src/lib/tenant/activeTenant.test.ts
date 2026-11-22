import { describe, expect, it } from "vitest";

import { getActiveTenantId, setActiveTenantId } from "./activeTenant";

describe("SIG-02 active tenant", () => {
  it("remembersTheChosenTenantForThisTab", () => {
    expect(getActiveTenantId()).toBeUndefined();
    setActiveTenantId(7);
    expect(getActiveTenantId()).toBe(7);
  });
});
