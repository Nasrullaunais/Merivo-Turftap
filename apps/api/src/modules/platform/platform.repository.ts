import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "../../lib/db";
import { type LoginCodeChannel, loginCodeSends, tenants, users } from "./platform.tables";

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

export async function findLoginCodeSendSince(phone: string, since: Date) {
  const [send] = await db()
    .select()
    .from(loginCodeSends)
    .where(and(eq(loginCodeSends.phone, phone), gte(loginCodeSends.sentAt, since)))
    .orderBy(desc(loginCodeSends.sentAt))
    .limit(1);
  return send;
}

export async function recordLoginCodeSend(phone: string, channel: LoginCodeChannel) {
  await db().insert(loginCodeSends).values({ phone, channel });
}
