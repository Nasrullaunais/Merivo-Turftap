import { describe, expect, it } from "vitest";

import { ApiError, toApiError } from "./ApiError";

describe("toApiError", () => {
  it("readsTheErrorEnvelope", () => {
    const error = toApiError(
      {
        status: 409,
        code: "tt_ven_002",
        message: "Another venue already has this name",
        traceId: "abc",
      },
      new Response(null, { status: 409 }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "tt_ven_002", traceId: "abc" });
    expect(error.message).toBe("Another venue already has this name");
  });

  it("handlesANetworkFailureWithNoReply", () => {
    const error = toApiError(new TypeError("Failed to fetch"), undefined);
    expect(error).toMatchObject({ status: 0, message: "Failed to fetch", fieldErrors: [] });
  });
});
