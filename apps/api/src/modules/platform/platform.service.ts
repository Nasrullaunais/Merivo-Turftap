import { type Me, PhoneInput, type Tenant } from "@turftap/contract";

import type { AuthContext, Caller } from "../../lib/auth/context";
import { ROLE_PERMISSIONS } from "../../lib/auth/permissions";
import { config } from "../../lib/config";
import { transaction } from "../../lib/db";
import { httpErrors } from "../../lib/errors";
import { sameSecret } from "../../lib/same-secret";
import { ttlCache } from "../../lib/ttl-cache";
import { ports } from "../../ports";
import * as customersService from "../customers/customers.service";
import * as staffService from "../staff/staff.service";
import { platformErrors } from "./platform.errors";
import * as platformRepository from "./platform.repository";
import type { LoginCodeChannel } from "./platform.tables";

export type CallerHeaders = {
  authorization?: string;
  tenantId?: string;
  tenantSlug?: string;
  customerPhone?: string;
};

const staffCallers = ttlCache<Caller>(config.auth.cacheSeconds);
const customerSignIns = ttlCache<{ userId: number; tenantId: number; phone: string }>(
  config.auth.cacheSeconds,
);
const tenantsOn = ttlCache<true>(config.auth.cacheSeconds);

const bearerToken = (header?: string) => header?.match(/^Bearer (.+)$/)?.[1];
const assistantKey = (header?: string) => header?.match(/^Assistant (.+)$/)?.[1];

function parseTenantId(header?: string) {
  if (header === undefined) return undefined;
  const id = Number(header);
  if (!Number.isSafeInteger(id) || id <= 0) throw platformErrors.badTenantId();
  return id;
}

function parseCustomerPhone(header?: string) {
  const parsed = PhoneInput.safeParse(header);
  if (!parsed.success) throw platformErrors.badCustomerPhone();
  return parsed.data;
}

/**
 * Works out who is calling and for which tenant (docs/architecture/tenancy.md). The tenant comes
 * from the caller's headers and is checked here, never taken from a body or URL.
 */
export async function resolveCaller(headers: CallerHeaders): Promise<Caller> {
  const key = assistantKey(headers.authorization);
  if (key) return assistantCaller(key, headers);
  const token = bearerToken(headers.authorization);
  if (!token) return publicCaller(headers.tenantSlug);
  if (headers.tenantSlug) return customerCaller(token, headers.tenantSlug);
  const tenantId = parseTenantId(headers.tenantId);
  return staffCallers.get(`${token}|${tenantId}`, () => staffCaller(token, tenantId));
}

function onOrNotFound<T extends { active: boolean }>(tenant: T | undefined) {
  if (!tenant?.active) throw platformErrors.tenantNotFound();
  return tenant;
}

/** PLA-03: the portal tells an unknown address apart from a tenant that was turned off. */
async function portalTenant(slug: string) {
  const tenant = await platformRepository.findTenantBySlug(slug);
  if (!tenant) throw platformErrors.tenantNotFound();
  if (!tenant.active) throw platformErrors.tenantOff();
  return tenant;
}

async function publicCaller(slug?: string): Promise<Caller> {
  if (!slug) return { actor: "public" };
  const tenant = await portalTenant(slug);
  return { actor: "public", tenantId: tenant.id };
}

// The customer record is looked up on every request, not cached, so it is there right after
// the customer creates it (POR-03).
async function withCustomerRecord(caller: Caller & { tenantId: number; phone: string }) {
  const customerId = await customersService.findIdByPhone(caller.tenantId, caller.phone);
  return { ...caller, customerId };
}

async function customerCaller(token: string, slug: string): Promise<Caller> {
  const signIn = await customerSignIns.get(`${token}|${slug}`, async () => {
    const { phone } = await ports().auth.verify(token);
    const tenant = await portalTenant(slug);
    const user = await platformRepository.findOrCreateUser(phone);
    return { userId: user.id, tenantId: tenant.id, phone };
  });
  return withCustomerRecord({ actor: "customer", ...signIn });
}

/** AST-*: n8n, acting for the customer whose WhatsApp number is in X-Customer-Phone. */
async function assistantCaller(key: string, headers: CallerHeaders): Promise<Caller> {
  if (!sameSecret(key, config.auth.assistantApiKey)) throw platformErrors.wrongAssistantKey();
  const tenantId = parseTenantId(headers.tenantId);
  if (tenantId === undefined) return { actor: "assistant" };
  const phone = parseCustomerPhone(headers.customerPhone);
  await tenantsOn.get(String(tenantId), async () => {
    onOrNotFound(await platformRepository.findTenantById(tenantId));
    return true;
  });
  return withCustomerRecord({ actor: "assistant", tenantId, phone });
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
  const access = await staffService.accessOf(tenantId, user.id);
  if (!access) throw platformErrors.notStaffHere();
  return { actor: "staff", userId: user.id, tenantId, ...access };
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

export async function me(caller: Caller): Promise<Me> {
  if (caller.userId === undefined) throw httpErrors.notAllowed();
  const user = await platformRepository.findUserById(caller.userId);
  if (!user) throw new Error(`User ${caller.userId} signed in but has no row`);
  const roles = new Map(
    (await staffService.rolesAcrossTenants(user.id)).map((row) => [row.tenantId, row.role]),
  );
  const tenants = await platformRepository.findTenantsByIds([...roles.keys()]);
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    tenants: tenants.flatMap(({ id, slug, name }) => {
      const role = roles.get(id);
      return role ? [{ id, slug, name, role, permissions: [...ROLE_PERMISSIONS[role]] }] : [];
    }),
  };
}

/** POR-01: the name shown at the top of the portal. */
export async function tenant(auth: AuthContext): Promise<Tenant> {
  const row = await platformRepository.findTenantById(auth.tenantId);
  if (!row) throw platformErrors.tenantNotFound();
  return { slug: row.slug, name: row.name };
}
