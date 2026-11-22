import type { Me } from "@turftap/contract";

import type { Caller } from "../../lib/auth/context";
import { config } from "../../lib/config";
import { httpErrors } from "../../lib/errors";
import { ttlCache } from "../../lib/ttl-cache";
import { ports } from "../../ports";
import * as staffService from "../staff/staff.service";
import { platformErrors } from "./platform.errors";
import * as platformRepository from "./platform.repository";

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
      return role ? [{ id, slug, name, role }] : [];
    }),
  };
}
