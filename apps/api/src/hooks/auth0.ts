import { createHash, timingSafeEqual } from "node:crypto";

import { PhoneNumber } from "@turftap/contract";
import { Hono } from "hono";
import { z } from "zod";

import { config } from "../lib/config";
import { httpErrors } from "../lib/errors";
import { ok } from "../lib/http/envelope";
import { jsonBody, parse } from "../lib/http/input";
import * as platformService from "../modules/platform/platform.service";

const SendCode = z.object({ phone: PhoneNumber, code: z.string().regex(/^\d{6}$/) });

const digest = (text: string) => createHash("sha256").update(text).digest();

function hasSecret(authorization: string | undefined) {
  const secret = config.auth.hookSecret;
  if (!secret || !authorization) return false;
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}

export const auth0Hooks = new Hono().post("/send-code", async (c) => {
  if (!hasSecret(c.req.header("Authorization"))) throw httpErrors.invalidToken();
  const { phone, code } = parse(SendCode, await jsonBody(c));
  await platformService.sendLoginCode(phone, code);
  return ok(c, null);
});
