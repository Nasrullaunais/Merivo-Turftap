import { describe, expect, it } from "vitest";

import { tenantSlugFrom } from "./tenantSlug";

describe("POR-01 tenantSlugFrom", () => {
  it("readsTheSubdomain", () => {
    expect(tenantSlugFrom({ hostname: "kickoff.turftap.lk", search: "" })).toBe("kickoff");
  });

  it("usesTheTenantParameterLocally", () => {
    expect(tenantSlugFrom({ hostname: "localhost", search: "?tenant=arena" })).toBe("arena");
  });
});
