import { describe, expect, it } from "bun:test";

import { loadConfig } from "./config";

const base = { DATABASE_URL: "postgres://u:p@localhost:5432/db" };

describe("config", () => {
  it("loadConfig_fillsDefaults", () => {
    const config = loadConfig(base);
    expect(config).toMatchObject({ port: 3000, auth: { provider: { kind: "fake" } } });
  });

  it("loadConfig_refusesAMissingDatabaseUrl", () => {
    expect(() => loadConfig({})).toThrow("DATABASE_URL");
  });

  it("loadConfig_refusesAuth0WithoutItsSettings", () => {
    expect(() => loadConfig({ ...base, AUTH_PROVIDER: "auth0" })).toThrow(
      "AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_HOOK_SECRET must be set",
    );
  });

  it("loadConfig_refusesFakeAdaptersInProduction", () => {
    expect(() => loadConfig({ ...base, NODE_ENV: "production" })).toThrow("Fake adapters");
  });
});
