import type { Resource, Slot, Venue } from "@turftap/contract/client";

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
const CREATED = "2026-11-01T00:00:00.000Z";

export const tenant = { slug: "demo", name: "Kick Off Sports" };

export const venue: Venue = {
  id: 1,
  name: "Kick Off Arena",
  description: "Two indoor futsal courts",
  address: "45 Galle Road, Colombo 03",
  phone: "+94112345678",
  timeZone: "Asia/Colombo",
  openingHours: EVERY_DAY.map((weekday) => ({ weekday, opens: "06:00", closes: "24:00" })),
  bankAccount: null,
  advancePercent: 50,
  paymentTimeLimitMinutes: 20,
  cancellationCutOffHours: 24,
  payAtVenue: false,
  seriesPaymentDaysBefore: 2,
  hasGym: false,
  repeatCheckIns: false,
  active: true,
  createdAt: CREATED,
  updatedAt: CREATED,
};

export const court: Resource = {
  id: 2,
  venueId: venue.id,
  name: "Futsal Court 1",
  type: "FUTSAL_COURT",
  slotMinutes: 60,
  startIntervalMinutes: 60,
  price: { amount: 450_000, currency: "LKR" },
  active: true,
  createdAt: CREATED,
  updatedAt: CREATED,
};

const MS_PER_HOUR = 3_600_000;

/** A one-hour slot from `startsAt`, priced in rupees. */
export const slot = (startsAt: string, rupees: number, free = true): Slot => ({
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + MS_PER_HOUR).toISOString(),
  price: { amount: rupees * 100, currency: "LKR" },
  free,
});
