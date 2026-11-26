import { describe, expect, it } from "vitest";

import { tenantSlugFrom } from "./tenantSlug";

describe("POR-01 tenantSlugFrom", () => {
  it("readsTheSubdomain", () => {
    expect(tenantSlugFrom({ hostname: "kickoff.turftap.lk", search: "" })).toBe("kickoff");
  });

  it("readsTheSubdomainOfATemporaryDomain", () => {
    expect(tenantSlugFrom({ hostname: "kickoff.167-114-120-81.sslip.io", search: "" })).toBe(
      "kickoff",
    );
  });

  it("usesTheTenantParameterLocally", () => {
    expect(tenantSlugFrom({ hostname: "localhost", search: "?tenant=arena" })).toBe("arena");
  });

  it("usesTheTenantParameterOnALocalNetworkAddress", () => {
    expect(tenantSlugFrom({ hostname: "192.168.8.20", search: "?tenant=arena" })).toBe("arena");
  });

  it("fallsBackToTheDemoTenantLocally", () => {
    expect(tenantSlugFrom({ hostname: "localhost", search: "" })).toBe("demo");
  });
});
