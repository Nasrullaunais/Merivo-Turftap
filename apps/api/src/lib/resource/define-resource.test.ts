import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { defineResource } from "./define-resource";

const Thing = z.object({ id: z.number() }).meta({ id: "TestThing" });

describe("defineResource", () => {
  it("refusesAnOperationWhoseServiceFunctionIsMissing", () => {
    expect(() =>
      defineResource({
        name: "things",
        operations: ["get", "delete"],
        schemas: { item: Thing },
        service: { get: async () => ({ id: 1 }) } as never,
      }),
    ).toThrow("service has no remove()");
  });

  it("refusesAFilterNamedLikeAPagingParameter", () => {
    expect(() =>
      defineResource({
        name: "things",
        operations: ["list"],
        schemas: { item: Thing, filters: z.object({ page: z.string().optional() }) },
        sort: { fields: ["id"], default: "id,asc" },
        service: {
          list: async () => ({ content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 }),
        },
      }),
    ).toThrow("filters may not be called page");
  });
});
