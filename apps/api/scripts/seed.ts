// Demo data for local development. Safe to run again: existing rows are left as they are.
import type { ResourceType } from "@turftap/contract";
import { eq } from "drizzle-orm";

import { closeDb, db } from "../src/lib/db";
import { tenants, users } from "../src/modules/platform/platform.tables";
import { staff } from "../src/modules/staff/staff.tables";
import { resources, venues } from "../src/modules/venues/venues.tables";

const DEMO_SLUG = "demo";
const PLATFORM_ADMIN_PHONE = "+94770000000";
const OWNER_PHONE = "+94770000001";

await db().insert(tenants).values({ slug: DEMO_SLUG, name: "Demo Sports" }).onConflictDoNothing();
const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, DEMO_SLUG));
if (!tenant) throw new Error("Demo tenant was not created");

await db()
  .insert(users)
  .values([
    { phone: PLATFORM_ADMIN_PHONE, name: "Platform Admin", isPlatformAdmin: true },
    { phone: OWNER_PHONE, name: "Demo Owner" },
  ])
  .onConflictDoNothing();
const [owner] = await db().select().from(users).where(eq(users.phone, OWNER_PHONE));
if (!owner) throw new Error("Demo owner was not created");

await db()
  .insert(staff)
  .values({ tenantId: tenant.id, userId: owner.id, role: "OWNER" })
  .onConflictDoNothing();

const everyDay = (opens: string, closes: string) =>
  [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opens, closes }));

await db()
  .insert(venues)
  .values([
    {
      tenantId: tenant.id,
      name: "Kick Off Arena",
      description: "Two indoor futsal courts",
      address: "45 Galle Road, Colombo 03",
      phone: "+94112345678",
      openingHours: everyDay("06:00", "24:00"),
    },
    {
      tenantId: tenant.id,
      name: "Cue Club Kandy",
      description: null,
      address: "12 Peradeniya Road, Kandy",
      phone: "+94812345678",
      openingHours: everyDay("10:00", "22:00"),
    },
  ])
  .onConflictDoNothing();

const venueIds = new Map(
  (
    await db()
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .where(eq(venues.tenantId, tenant.id))
  ).map((venue) => [venue.name, venue.id]),
);
const kickOff = venueIds.get("Kick Off Arena")!;
const cueClub = venueIds.get("Cue Club Kandy")!;

const resource = (
  venueId: number,
  name: string,
  type: ResourceType,
  slotMinutes: number,
): typeof resources.$inferInsert => ({ tenantId: tenant.id, venueId, name, type, slotMinutes });

await db()
  .insert(resources)
  .values([
    resource(kickOff, "Futsal Court 1", "FUTSAL_COURT", 60),
    resource(kickOff, "Futsal Court 2", "FUTSAL_COURT", 60),
    resource(cueClub, "Pool Table 1", "POOL_TABLE", 30),
    resource(cueClub, "Pool Table 2", "POOL_TABLE", 30),
    resource(cueClub, "Table Tennis 1", "TABLE_TENNIS_TABLE", 30),
  ])
  .onConflictDoNothing();

console.log(`Seeded tenant "${DEMO_SLUG}". Sign in as owner with: Bearer fake:${OWNER_PHONE}`);
await closeDb();
