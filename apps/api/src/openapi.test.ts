import { describe, expect, it } from "bun:test";

import { buildOpenApiDocument, OPENAPI_PATH, serialize } from "./openapi";

describe("openapi.json", () => {
  it("matchesTheResourceDeclarations_runBunRunGenIfThisFails", async () => {
    const committed = await Bun.file(OPENAPI_PATH).text();
    expect(committed).toBe(serialize(buildOpenApiDocument()));
  });
});
