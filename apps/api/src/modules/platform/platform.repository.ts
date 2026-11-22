import { eq } from "drizzle-orm";

import { db } from "../../lib/db";
import { tenants, users } from "./platform.tables";

// Platform tables belong to no tenant, so these functions don't take a tenant id.

export async function findTenantById(id: number) {
  const [tenant] = await db().select().from(tenants).where(eq(tenants.id, id));
  return tenant;
}

export async function findTenantBySlug(slug: string) {
  const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, slug));
  return tenant;
}

export async function findOrCreateUser(phone: string) {
  const [created] = await db().insert(users).values({ phone }).onConflictDoNothing().returning();
  if (created) return created;
  const [existing] = await db().select().from(users).where(eq(users.phone, phone));
  if (!existing) throw new Error(`User ${phone} vanished between insert and select`);
  return existing;
}
