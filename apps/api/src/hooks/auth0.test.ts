import { describe, expect, it } from "bun:test";

import { createApp } from "../app";
import { testPorts } from "../test/ports";
import { uniquePhone } from "../test/fixtures";

const app = createApp();
const SECRET = process.env.AUTH0_HOOK_SECRET!;

const sendCode = (body: unknown, secret = SECRET) =>
  app.request("/hooks/auth0/send-code", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("SIG-01 Auth0 send-code hook", () => {
  it("sendCode_deliversTheCodeToThePhone", async () => {
    const phone = uniquePhone();
    const reply = await sendCode({ phone, code: "123456" });
    expect(reply.status).toBe(200);
    expect(testPorts.messaging.sent).toContainEqual({
      kind: "login-code",
      to: phone,
      code: "123456",
    });
  });

  it("sendCode_refusesAWrongSecret", async () => {
    const phone = uniquePhone();
    const reply = await sendCode({ phone, code: "123456" }, "not-the-secret");
    expect(reply.status).toBe(401);
    expect(testPorts.messaging.sent.some((message) => message.to === phone)).toBe(false);
  });

  it("sendCode_refusesABodyWithoutAPhoneInStoredFormat", async () => {
    const reply = await sendCode({ phone: "077 123 4567", code: "123456" });
    expect(reply.status).toBe(400);
    const body = (await reply.json()) as { errors: { field: string }[] };
    expect(body.errors).toContainEqual(expect.objectContaining({ field: "phone" }));
  });
});
