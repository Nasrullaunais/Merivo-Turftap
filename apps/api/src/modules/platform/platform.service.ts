import type { Caller } from "../../lib/auth/context";
import { config } from "../../lib/config";
import { transaction } from "../../lib/db";
import { ttlCache } from "../../lib/ttl-cache";
import { ports } from "../../ports";
import * as staffService from "../staff/staff.service";
import { platformErrors } from "./platform.errors";
import * as platformRepository from "./platform.repository";
import type { LoginCodeChannel } from "./platform.tables";

export type CallerHeaders = {
  authorization?: string;
  tenantId?: string;
  tenantSlug?: string;
};

const callers = ttlCache<Caller>(config.auth.cacheSeconds);

const bearerToken = (header?: string) => header?.match(/^Bearer (.+)$/)?.[1];

function parseTenantId(header?: string) {
  if (header === undefined) return undefined;
  const id = Number(header);
  if (!Number.isSafeInteger(id) || id <= 0) throw platformErrors.badTenantId();
  return id;
}

/**
 * Works out who is calling and for which tenant (docs/architecture/tenancy.md). The tenant comes
 * from the caller's headers and is checked here, never taken from a body or URL.
 */
export async function resolveCaller(headers: CallerHeaders): Promise<Caller> {
  const token = bearerToken(headers.authorization);
  if (!token) return publicCaller(headers.tenantSlug);
  if (headers.tenantSlug) throw platformErrors.customerSignInNotBuilt();
  const tenantId = parseTenantId(headers.tenantId);
  return callers.get(`${token}|${tenantId}`, () => staffCaller(token, tenantId));
}

async function publicCaller(slug?: string): Promise<Caller> {
  if (!slug) return { actor: "public" };
  const tenant = await platformRepository.findTenantBySlug(slug);
  if (!tenant?.active) throw platformErrors.tenantNotFound();
  return { actor: "public", tenantId: tenant.id };
}

async function staffCaller(token: string, tenantId?: number): Promise<Caller> {
  const { phone } = await ports().auth.verify(token);
  const user = await platformRepository.findOrCreateUser(phone);
  if (user.isPlatformAdmin) {
    if (tenantId !== undefined && !(await platformRepository.findTenantById(tenantId))) {
      throw platformErrors.tenantNotFound();
    }
    return { actor: "platform_admin", userId: user.id, tenantId };
  }
  if (tenantId === undefined) return { actor: "staff", userId: user.id };
  const role = await staffService.roleOf(tenantId, user.id);
  if (!role) throw platformErrors.notStaffHere();
  return { actor: "staff", userId: user.id, tenantId, role };
}

const RESEND_BY_SMS_WITHIN_MINUTES = 10;
const MINUTE_MS = 60_000;

const LOGIN_CODE_SENDERS: Record<LoginCodeChannel, (to: string, code: string) => Promise<void>> = {
  WHATSAPP: (to, code) => ports().messaging.send({ kind: "login-code", to, code }),
  SMS: (to, code) =>
    ports().sms.send({ to, text: `Your TurfTap sign-in code is ${code}. Don't share it.` }),
};

/** A resend soon after a code goes by SMS, so a user whose WhatsApp code never came still gets in. */
export async function sendLoginCode(phone: string, code: string): Promise<void> {
  const since = new Date(Date.now() - RESEND_BY_SMS_WITHIN_MINUTES * MINUTE_MS);
  const channel = await transaction(async () => {
    const recent = await platformRepository.findLoginCodeSendSince(phone, since);
    const chosen: LoginCodeChannel = recent ? "SMS" : "WHATSAPP";
    await platformRepository.recordLoginCodeSend(phone, chosen);
    return chosen;
  });
  await LOGIN_CODE_SENDERS[channel](phone, code);
}
