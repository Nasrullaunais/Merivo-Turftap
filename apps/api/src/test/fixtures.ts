import type { CreateResource, CreateVenue } from "@turftap/contract";

import { fakeTokenFor } from "../adapters/auth-provider/fake/fake-auth-provider";
import { createApp } from "../app";
import type { AuthContext, StaffRole } from "../lib/auth/context";
import { db } from "../lib/db";
import { tenants, users } from "../modules/platform/platform.tables";
import { staff } from "../modules/staff/staff.tables";

const PHONE_DIGITS = 7;

/** A phone number no other test uses. */
export const uniquePhone = () =>
  `+9477${String(Math.floor(Math.random() * 10 ** PHONE_DIGITS)).padStart(PHONE_DIGITS, "0")}`;

export type TestStaff = { phone: string; userId: number; auth: AuthContext };

/** A new tenant, with one staff member per role. */
export async function createTenant() {
  const slug = `t-${crypto.randomUUID().slice(0, 8)}`;
  const [tenant] = await db()
    .insert(tenants)
    .values({ slug, name: `Tenant ${slug}` })
    .returning();
  const tenantId = tenant!.id;

  const addStaff = async (role: StaffRole): Promise<TestStaff> => {
    const phone = uniquePhone();
    const [user] = await db().insert(users).values({ phone }).returning();
    await db().insert(staff).values({ tenantId, userId: user!.id, role });
    return { phone, userId: user!.id, auth: { actor: "staff", tenantId, userId: user!.id, role } };
  };

  return {
    id: tenantId,
    slug,
    owner: await addStaff("OWNER"),
    manager: await addStaff("MANAGER"),
    frontDesk: await addStaff("FRONT_DESK"),
    publicAuth: { actor: "public", tenantId } satisfies AuthContext,
  };
}

export type TestTenant = Awaited<ReturnType<typeof createTenant>>;

export const venueInput = (overrides: Partial<CreateVenue> = {}): CreateVenue => ({
  name: `Arena ${crypto.randomUUID().slice(0, 6)}`,
  description: null,
  address: "12 Galle Road, Colombo 03",
  phone: "+94112345678",
  openingHours: [{ weekday: 1, opens: "06:00", closes: "23:00" }],
  ...overrides,
});

export const resourceInput = (
  venueId: number,
  overrides: Partial<CreateResource> = {},
): CreateResource => ({
  venueId,
  name: `Court ${crypto.randomUUID().slice(0, 6)}`,
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  ...overrides,
});

const app = createApp();

type As = { phone?: string; tenantId?: number; tenantSlug?: string };

/** Sends a request through the whole app, signed in with the fake auth provider. */
export async function call(method: string, path: string, as: As = {}, body?: unknown) {
  const headers: Record<string, string> = {};
  if (as.phone) headers.Authorization = `Bearer ${fakeTokenFor(as.phone)}`;
  if (as.tenantId !== undefined) headers["X-Tenant-Id"] = String(as.tenantId);
  if (as.tenantSlug) headers["X-Tenant-Slug"] = as.tenantSlug;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await app.request(path, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    status: response.status,
    headers: response.headers,
    // oxlint-disable-next-line typescript/no-explicit-any -- tests read whatever the reply holds
    body: (await response.json()) as any,
  };
}

export const asStaff = (tenant: TestTenant, who: TestStaff = tenant.owner): As => ({
  phone: who.phone,
  tenantId: tenant.id,
});
