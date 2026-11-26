import type { Booking, Customer, Me, Resource, Slot, Venue } from "@turftap/contract/client";

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

export const customer: Customer = {
  id: 7,
  phone: "+94771234567",
  name: "Kasun Perera",
  createdAt: CREATED,
  updatedAt: CREATED,
};

/** The signed-in person, before any tenant knows their name. */
export const me: Me = {
  id: 3,
  phone: customer.phone,
  name: null,
  isPlatformAdmin: false,
  tenants: [],
};

const BOOKED_AT = "2026-11-27T20:00:00.000Z";
const PAY_WITHIN_MS = 20 * 60_000;

/** Futsal Court 1 from 18:00 to 20:00 in Colombo on Sat 28 Nov, just booked online at a 50% Advance. */
export const booking: Booking = {
  id: 41,
  venueId: venue.id,
  resourceId: court.id,
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  repeatSeriesId: null,
  startsAt: "2026-11-28T12:30:00.000Z",
  endsAt: "2026-11-28T14:30:00.000Z",
  status: "AWAITING_PAYMENT",
  source: "ONLINE",
  price: { amount: 900_000, currency: "LKR" },
  amountDue: { amount: 450_000, currency: "LKR" },
  paid: { amount: 0, currency: "LKR" },
  balance: { amount: 900_000, currency: "LKR" },
  expiresAt: new Date(Date.parse(BOOKED_AT) + PAY_WITHIN_MS).toISOString(),
  cancellationCutOffHours: 24,
  cancelReason: null,
  bankAccount: {
    bankName: "Commercial Bank",
    branch: "Kollupitiya",
    accountName: "Kick Off Sports (Pvt) Ltd",
    accountNumber: "8001 2345 6789",
  },
  createdAt: BOOKED_AT,
  updatedAt: BOOKED_AT,
};
