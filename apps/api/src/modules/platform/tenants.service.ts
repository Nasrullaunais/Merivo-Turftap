import { PhoneInput } from "@turftap/contract";
import { z } from "zod";

import { transaction } from "../../lib/db";
import { parse } from "../../lib/http/input";
import { addDays, instantAt, todayIn } from "../../lib/time";
import * as bookingsService from "../bookings/bookings.service";
import * as staffService from "../staff/staff.service";
import { platformErrors } from "./platform.errors";
import * as platformRepository from "./platform.repository";

// Run by a Platform Admin from scripts on the server (D-25), not through the API.

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 30;
const MAX_TENANT_NAME_LENGTH = 80;
/** Addresses the server itself answers on, so no tenant portal can have them (D-40). */
const RESERVED_SLUGS = ["www", "api", "console", "admin", "app", "n8n", "mail", "status", "help"];
const SRI_LANKA = "Asia/Colombo";
const DAYS_PAST_ANY_MONTH_END = 32;

const Slug = z
  .string()
  .trim()
  .min(SLUG_MIN_LENGTH)
  .max(SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens only")
  .refine((slug) => !RESERVED_SLUGS.includes(slug), "This web address is kept for TurfTap");

const CreateTenant = z.object({
  slug: Slug,
  name: z.string().trim().min(1).max(MAX_TENANT_NAME_LENGTH),
  ownerPhone: PhoneInput,
});

/** PLA-01: the tenant and its first Owner, who gets a WhatsApp welcome with the console link. */
export async function create(input: z.input<typeof CreateTenant>) {
  const { slug, name, ownerPhone } = parse(CreateTenant, input);
  return transaction(async () => {
    const tenant = await platformRepository.insertTenant({ slug, name });
    await staffService.addFirstOwner(tenant.id, ownerPhone);
    return { ...tenant, ownerPhone };
  });
}

/** PLA-03: off refuses every change at the tenant; on undoes it. */
export async function setActive(slug: string, active: boolean) {
  const tenant = await transaction(() => platformRepository.setTenantActive(slug, active));
  if (!tenant) throw platformErrors.tenantNotFound();
  return tenant;
}

/** The calendar month around `now` on Sri Lankan clocks, as [from, to). */
function monthAround(now: Date) {
  const firstDay = `${todayIn(SRI_LANKA, now).slice(0, "YYYY-MM-".length)}01`;
  const nextFirstDay = `${addDays(firstDay, DAYS_PAST_ANY_MONTH_END).slice(0, "YYYY-MM-".length)}01`;
  return { from: instantAt(firstDay, 0, SRI_LANKA), to: instantAt(nextFirstDay, 0, SRI_LANKA) };
}

/** PLA-04: every tenant, with the bookings starting this month that weren't expired or cancelled. */
export async function list(now = new Date()) {
  const { from, to } = monthAround(now);
  const [tenants, counts] = await Promise.all([
    platformRepository.listTenants(),
    bookingsService.countStartingBetweenAcrossTenants(from, to),
  ]);
  return tenants.map((tenant) => ({ ...tenant, bookingsThisMonth: counts.get(tenant.id) ?? 0 }));
}

/** Lets this phone's user act as a Platform Admin, creating the user if they never signed in. */
export async function addPlatformAdmin(phone: string) {
  const parsed = parse(z.object({ phone: PhoneInput }), { phone }).phone;
  return transaction(async () => {
    const user = await platformRepository.findOrCreateUser(parsed);
    await platformRepository.makePlatformAdmin(user.id);
    return user;
  });
}
