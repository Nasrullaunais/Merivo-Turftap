import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import { NotFound } from "../errors";
import { onError } from "./error-handler";
import { requestContext } from "./request-context";

const appThrowing = (error: unknown) => {
  const app = new Hono();
  app.use(requestContext);
  app.get("/", () => {
    throw error;
  });
  app.onError(onError);
  return app;
};

describe("central error handler", () => {
  it("unknownError_repliesWithAPlainMessageAndNoDetails", async () => {
    const response = await appThrowing(new Error("password=hunter2 in SQL")).request("/");
    const body = (await response.json()) as { traceId: string | null };
    expect(response.status).toBe(500);
    expect(body).toMatchObject({ code: "tt_htt_500", message: "Something went wrong on our side" });
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(body.traceId).toBe(response.headers.get("X-Request-Id"));
  });

  it("appError_keepsItsStatusAndCode", async () => {
    const response = await appThrowing(new NotFound("tt_ven_001", "Venue 9 was not found")).request(
      "/",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "tt_ven_001",
      message: "Venue 9 was not found",
    });
  });
});
