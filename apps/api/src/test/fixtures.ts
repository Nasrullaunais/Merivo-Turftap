import { type CreatePriceRule, type CreateResource, CreateVenue } from "@turftap/contract";
import { eq } from "drizzle-orm";
import type { z } from "zod";

import { fakeTokenFor } from "../adapters/auth-provider/fake/fake-auth-provider";
import { createApp } from "../app";
import type { AuthContext, StaffRole } from "../lib/auth/context";
import { config } from "../lib/config";
import { db } from "../lib/db";
import { tenants, users } from "../modules/platform/platform.tables";
import { staff } from "../modules/staff/staff.tables";

const PHONE_DIGITS = 7;
let phonesHandedOut = 0;

/** A phone number no other test in this run uses. Tests that type a number use other prefixes. */
export const uniquePhone = () => `+9470${String(++phonesHandedOut).padStart(PHONE_DIGITS, "0")}`;

export type TestStaff = { phone: string; userId: number; staffId: number; auth: AuthContext };

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
    const [row] = await db().insert(staff).values({ tenantId, userId: user!.id, role }).returning();
    return {
      phone,
      userId: user!.id,
      staffId: row!.id,
      auth: { actor: "staff", tenantId, userId: user!.id, role },
    };
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

/** A valid venue, with the defaults CreateVenue fills in, so services can take it as it is. */
export const venueInput = (overrides: Partial<z.input<typeof CreateVenue>> = {}): CreateVenue =>
  CreateVenue.parse({
    name: `Arena ${crypto.randomUUID().slice(0, 6)}`,
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
  price: { amount: 250_000, currency: "LKR" },
  ...overrides,
});

export const priceRuleInput = (
  resourceId: number,
  overrides: Partial<CreatePriceRule> = {},
): CreatePriceRule => ({
  resourceId,
  weekdays: [6, 7],
  startTime: "18:00",
  endTime: "22:00",
  price: { amount: 400_000, currency: "LKR" },
  ...overrides,
});

const app = createApp();

type As = {
  phone?: string;
  tenantId?: number;
  tenantSlug?: string;
  assistantKey?: string;
  customerPhone?: string;
};

/** Sends a request through the whole app, signed in with the fake auth provider. */
export async function call(method: string, path: string, as: As = {}, body?: unknown) {
  const headers: Record<string, string> = {};
  if (as.phone) headers.Authorization = `Bearer ${fakeTokenFor(as.phone)}`;
  if (as.assistantKey) headers.Authorization = `Assistant ${as.assistantKey}`;
  if (as.tenantId !== undefined) headers["X-Tenant-Id"] = String(as.tenantId);
  if (as.tenantSlug) headers["X-Tenant-Slug"] = as.tenantSlug;
  if (as.customerPhone) headers["X-Customer-Phone"] = as.customerPhone;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const response = await app.request(path, {
    method,
    headers,
    body: body === undefined || isForm || typeof body === "string" ? body : JSON.stringify(body),
  });
  return {
    status: response.status,
    headers: response.headers,
    // oxlint-disable-next-line typescript/no-explicit-any -- tests read whatever the reply holds
    body: (await response.json()) as any,
  };
}

/** SIG-06: has the tenant's Owner limit this staff member to these venues. */
export async function limitToVenues(tenant: TestTenant, who: TestStaff, venueIds: number[]) {
  const body = { allVenues: false, venueIds };
  const reply = await call("PATCH", `/v1/staff/${who.staffId}`, asStaff(tenant), body);
  if (reply.status !== 200) throw new Error(`Could not limit staff: ${JSON.stringify(reply.body)}`);
}

const JPEG_START = [0xff, 0xd8, 0xff, 0xe0];
const PNG_START = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const FAKE_IMAGE_BYTES = 2048;

/** Bytes that start like a real JPG or PNG, which is all the API looks at. */
export function imageBytes(kind: "jpg" | "png" = "jpg", size = FAKE_IMAGE_BYTES) {
  const bytes = new Uint8Array(size);
  bytes.set(kind === "jpg" ? JPEG_START : PNG_START);
  return bytes;
}

export function uploadForm(bytes: Uint8Array, purpose = "PHOTO", type = "image/jpeg") {
  const form = new FormData();
  form.append("file", new File([bytes], "court.jpg", { type }));
  form.append("purpose", purpose);
  return form;
}

/** Uploads a photo file and returns its id, ready to be attached with POST /v1/photos. */
export async function uploadPhotoFile(as: As) {
  const reply = await call("POST", "/v1/files", as, uploadForm(imageBytes()));
  if (reply.status !== 201) throw new Error(`Upload failed: ${JSON.stringify(reply.body)}`);
  return reply.body.data.id as number;
}

export const asStaff = (tenant: TestTenant, who: TestStaff = tenant.owner): As => ({
  phone: who.phone,
  tenantId: tenant.id,
});

/** Signed in on the tenant's Customer Portal. */
export const asCustomer = (tenant: TestTenant, phone: string): As => ({
  phone,
  tenantSlug: tenant.slug,
});

/** The Assistant acting for the customer with this WhatsApp number. */
export const asAssistant = (tenant: TestTenant, customerPhone: string): As => ({
  assistantKey: config.auth.assistantApiKey,
  tenantId: tenant.id,
  customerPhone,
});

export async function turnOff(tenant: TestTenant) {
  await db().update(tenants).set({ active: false }).where(eq(tenants.id, tenant.id));
}
