import { and, asc, desc, eq, getTableColumns, gte, inArray, sql } from "drizzle-orm";

import { db, pageOf, type PageRequest, sortBy } from "../../lib/db";
import {
  type LoginCodeChannel,
  loginCodeSends,
  tenants,
  users,
  whatsappNumbers,
} from "./platform.tables";

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

export async function findUserById(id: number) {
  const [user] = await db().select().from(users).where(eq(users.id, id));
  return user;
}

export async function findTenantsByIds(ids: number[]) {
  if (!ids.length) return [];
  return db()
    .select()
    .from(tenants)
    .where(inArray(tenants.id, ids))
    .orderBy(asc(sql`lower(${tenants.name})`));
}

export async function findUsersByIds(ids: number[]) {
  if (!ids.length) return [];
  return db().select().from(users).where(inArray(users.id, ids));
}

const WHATSAPP_NUMBER_SORTABLE = { createdAt: whatsappNumbers.createdAt };

export function listWhatsAppNumbers(
  phoneNumberId: string,
  page: PageRequest<keyof typeof WHATSAPP_NUMBER_SORTABLE>,
) {
  const where = eq(whatsappNumbers.phoneNumberId, phoneNumberId);
  return pageOf(
    page,
    db()
      .select({ ...getTableColumns(whatsappNumbers), tenantActive: tenants.active })
      .from(whatsappNumbers)
      .innerJoin(tenants, eq(tenants.id, whatsappNumbers.tenantId))
      .where(where)
      .orderBy(...sortBy(page, WHATSAPP_NUMBER_SORTABLE, whatsappNumbers.id))
      .limit(page.size)
      .offset(page.page * page.size),
    db().$count(whatsappNumbers, where),
  );
}

export async function findWhatsAppNumberOfTenant(tenantId: number) {
  const [number] = await db()
    .select()
    .from(whatsappNumbers)
    .where(eq(whatsappNumbers.tenantId, tenantId));
  return number;
}

export async function insertWhatsAppNumber(values: typeof whatsappNumbers.$inferInsert) {
  const [number] = await db().insert(whatsappNumbers).values(values).returning();
  return number!;
}

export async function deleteWhatsAppNumberOfTenant(tenantId: number) {
  const [number] = await db()
    .delete(whatsappNumbers)
    .where(eq(whatsappNumbers.tenantId, tenantId))
    .returning();
  return number;
}
