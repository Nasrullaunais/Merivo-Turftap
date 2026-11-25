// Demo data for local development. Safe to run again: existing rows are left as they are.
import { membershipLastDay, type ResourceType } from "@turftap/contract";
import { and, eq, isNull } from "drizzle-orm";

import { closeDb, db } from "../src/lib/db";
import { addDays, todayIn } from "../src/lib/time";
import { customers } from "../src/modules/customers/customers.tables";
import { membershipPlans, memberships } from "../src/modules/memberships/memberships.tables";
import { payments } from "../src/modules/payments/payments.tables";
import { tenants, users } from "../src/modules/platform/platform.tables";
import { staff, staffVenues } from "../src/modules/staff/staff.tables";
import { priceRules, resources, venues } from "../src/modules/venues/venues.tables";

const DEMO_SLUG = "demo";
const PLATFORM_ADMIN_PHONE = "+94770000000";
const OWNER_PHONE = "+94770000001";
const KANDY_MANAGER_PHONE = "+94770000002";

await db().insert(tenants).values({ slug: DEMO_SLUG, name: "Demo Sports" }).onConflictDoNothing();
const [tenant] = await db().select().from(tenants).where(eq(tenants.slug, DEMO_SLUG));
if (!tenant) throw new Error("Demo tenant was not created");

await db()
  .insert(users)
  .values([
    { phone: PLATFORM_ADMIN_PHONE, name: "Platform Admin", isPlatformAdmin: true },
    { phone: OWNER_PHONE, name: "Demo Owner" },
    { phone: KANDY_MANAGER_PHONE, name: "Kandy Manager" },
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
    {
      tenantId: tenant.id,
      name: "Peak Fitness Colombo",
      description: "Gym with weights and cardio",
      address: "88 Duplication Road, Colombo 04",
      phone: "+94112567890",
      openingHours: everyDay("05:00", "22:00"),
      hasGym: true,
      bankAccount: {
        bankName: "Sampath Bank",
        branch: "Bambalapitiya",
        accountName: "Peak Fitness (Pvt) Ltd",
        accountNumber: "1029 5566 7788",
      },
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

// VEN-03: venues seeded before payment settings existed get a bank account once.
const paymentSettings = [
  {
    id: kickOff,
    advancePercent: 50,
    bankAccount: {
      bankName: "Bank of Ceylon",
      branch: "Kollupitiya",
      accountName: "Kick Off Arena (Pvt) Ltd",
      accountNumber: "0071 2345 678",
    },
  },
  {
    id: cueClub,
    advancePercent: 100,
    bankAccount: {
      bankName: "Commercial Bank",
      branch: "Kandy",
      accountName: "Cue Club Kandy",
      accountNumber: "8001 234 567",
    },
  },
];
for (const { id, ...settings } of paymentSettings) {
  await db()
    .update(venues)
    .set(settings)
    .where(and(eq(venues.id, id), isNull(venues.bankAccount)));
}

// SIG-06: a Manager who works only at the Kandy venue.
const [kandyManager] = await db().select().from(users).where(eq(users.phone, KANDY_MANAGER_PHONE));
await db()
  .insert(staff)
  .values({ tenantId: tenant.id, userId: kandyManager!.id, role: "MANAGER", allVenues: false })
  .onConflictDoNothing();
const [kandyManagerStaff] = await db()
  .select()
  .from(staff)
  .where(and(eq(staff.tenantId, tenant.id), eq(staff.userId, kandyManager!.id)));
await db()
  .insert(staffVenues)
  .values({ tenantId: tenant.id, staffId: kandyManagerStaff!.id, venueId: cueClub })
  .onConflictDoNothing();

const RUPEES = 100;
const lkr = (rupees: number) => ({ priceAmount: rupees * RUPEES, priceCurrency: "LKR" as const });

const resource = (
  venueId: number,
  name: string,
  type: ResourceType,
  slotMinutes: number,
  startIntervalMinutes: number,
  rupees: number,
): typeof resources.$inferInsert => ({
  tenantId: tenant.id,
  venueId,
  name,
  type,
  slotMinutes,
  startIntervalMinutes,
  ...lkr(rupees),
});

const demoResources = [
  resource(kickOff, "Futsal Court 1", "FUTSAL_COURT", 60, 30, 4500),
  resource(kickOff, "Futsal Court 2", "FUTSAL_COURT", 60, 30, 4500),
  resource(cueClub, "Pool Table 1", "POOL_TABLE", 30, 30, 600),
  resource(cueClub, "Pool Table 2", "POOL_TABLE", 30, 30, 600),
  resource(cueClub, "Table Tennis 1", "TABLE_TENNIS_TABLE", 30, 30, 500),
];
await db().insert(resources).values(demoResources).onConflictDoNothing();

// Resources seeded before prices existed hold LKR 0; give them their demo price.
for (const { venueId, name, priceAmount } of demoResources) {
  await db()
    .update(resources)
    .set({ priceAmount })
    .where(
      and(eq(resources.venueId, venueId), eq(resources.name, name), eq(resources.priceAmount, 0)),
    );
}

const resourceIds = new Map(
  (
    await db()
      .select({ id: resources.id, name: resources.name })
      .from(resources)
      .where(and(eq(resources.tenantId, tenant.id), eq(resources.active, true)))
  ).map((row) => [row.name, row.id]),
);

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 7];
const rule = (name: string, weekdays: number[], from: string, to: string, rupees: number) => {
  const toMinute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return {
    tenantId: tenant.id,
    resourceId: resourceIds.get(name)!,
    weekdays,
    startMinute: toMinute(from),
    endMinute: toMinute(to),
    ...lkr(rupees),
  };
};

// A rule that is already there clashes with itself, so DO NOTHING keeps this safe to re-run.
await db()
  .insert(priceRules)
  .values(
    ["Futsal Court 1", "Futsal Court 2"].flatMap((court) => [
      rule(court, WEEKDAYS, "18:00", "24:00", 6000),
      rule(court, WEEKEND, "08:00", "24:00", 6000),
    ]),
  )
  .onConflictDoNothing();
await db()
  .insert(priceRules)
  .values(
    ["Pool Table 1", "Pool Table 2"].map((table) => rule(table, [5, 6], "18:00", "22:00", 800)),
  )
  .onConflictDoNothing();

// VEN-08, MEM-05: the gym's plans, and one customer for each thing the check-in desk can show.
const peakFitness = venueIds.get("Peak Fitness Colombo")!;
await db()
  .insert(membershipPlans)
  .values(
    [
      { name: "Gym monthly", lengthCount: 1, lengthUnit: "MONTHS" as const, ...lkr(6000) },
      { name: "Gym quarterly", lengthCount: 3, lengthUnit: "MONTHS" as const, ...lkr(16500) },
      { name: "10-day pass", lengthCount: 10, lengthUnit: "DAYS" as const, ...lkr(2500) },
    ].map((plan) => ({ ...plan, tenantId: tenant.id, venueId: peakFitness })),
  )
  .onConflictDoNothing();
const gymPlans = new Map(
  (
    await db()
      .select()
      .from(membershipPlans)
      .where(and(eq(membershipPlans.venueId, peakFitness), eq(membershipPlans.active, true)))
  ).map((plan) => [plan.name, plan]),
);

const today = todayIn("Asia/Colombo");
// Days from today each one starts; Ruwan's quarter ended a few days ago.
const demoMembers = [
  {
    phone: "+94771230003",
    name: "Kasun Jayawardena",
    plan: "Gym monthly",
    startsIn: -10,
    paid: true,
  },
  {
    phone: "+94771230002",
    name: "Nimali Silva",
    plan: "Gym monthly",
    startsIn: -3,
    paid: false,
  },
  {
    phone: "+94771230005",
    name: "Tharindu Bandara",
    plan: "10-day pass",
    startsIn: 5,
    paid: true,
  },
  {
    phone: "+94771230007",
    name: "Ruwan Fernando",
    plan: "Gym quarterly",
    startsIn: -95,
    paid: true,
  },
];
for (const member of demoMembers) {
  await db()
    .insert(customers)
    .values({ tenantId: tenant.id, phone: member.phone, name: member.name })
    .onConflictDoNothing();
  const [customer] = await db()
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenant.id), eq(customers.phone, member.phone)));
  const [held] = await db()
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.venueId, peakFitness), eq(memberships.customerId, customer!.id)));
  if (held) continue;
  const plan = gymPlans.get(member.plan)!;
  const startsOn = addDays(today, member.startsIn);
  const [membership] = await db()
    .insert(memberships)
    .values({
      tenantId: tenant.id,
      venueId: peakFitness,
      planId: plan.id,
      customerId: customer!.id,
      startsOn,
      endsOn: membershipLastDay(startsOn, plan.lengthCount, plan.lengthUnit),
      status: "ACTIVE",
      priceAmount: plan.priceAmount,
      priceCurrency: plan.priceCurrency,
      amountDue: 0,
      createdBy: owner.id,
    })
    .returning();
  if (member.paid)
    await db().insert(payments).values({
      tenantId: tenant.id,
      venueId: peakFitness,
      membershipId: membership!.id,
      kind: "CASH",
      status: "ACCEPTED",
      amount: plan.priceAmount,
      currency: plan.priceCurrency,
      createdBy: owner.id,
    });
}

console.log(`Seeded tenant "${DEMO_SLUG}". Sign in as owner with: Bearer fake:${OWNER_PHONE}`);
console.log(`Kandy-only Manager: Bearer fake:${KANDY_MANAGER_PHONE}`);
await closeDb();
