import {
  type AvailabilityFilters,
  BOOKING_HORIZON_DAYS,
  CENTS_PER_RUPEE,
  MAX_PAGE_SIZE,
  minuteOfDay,
  type Money,
  type Page,
  type Resource,
  type Slot,
  type Venue,
} from "@turftap/contract";

import type { AuthContext } from "../../lib/auth/context";
import type { PageRequest } from "../../lib/db";
import type { ListQuery } from "../../lib/resource";
import { addDays, instantAt, todayIn, weekdayOf } from "../../lib/time";
import * as blockedTimesService from "../venues/blocked-times.service";
import * as closedDatesService from "../venues/closed-dates.service";
import * as priceRulesService from "../venues/price-rules.service";
import * as resourcesService from "../venues/resources.service";
import * as venuesService from "../venues/venues.service";
import * as bookingsRepository from "./bookings.repository";

type AvailabilitySort = "startsAt";
type Window = { startsAt: Date; endsAt: Date };

const MINUTES_PER_DAY = 24 * 60;

/** Everything that decides which times one resource can be booked on one of the venue's dates. */
export type Day = {
  resourceId: number;
  date: string;
  timeZone: string;
  /** The resource and its venue are both active. */
  bookable: boolean;
  /** Minutes into the day. Missing when the venue doesn't open on this weekday. */
  hours?: { opens: number; closes: number };
  slotMinutes: number;
  intervalMinutes: number;
  defaultPrice: Money;
  rules: { startMinute: number; endMinute: number; price: Money }[];
  closed: boolean;
  blocked: Window[];
  /** Bookings that hold their slots. */
  booked: Window[];
  /** D-06: customers book only up to the horizon; staff book any date. */
  limitedToHorizon: boolean;
};

export async function loadDay(auth: AuthContext, resourceId: number, date: string): Promise<Day> {
  const resource = await resourcesService.get(auth, resourceId);
  const venue = await venuesService.get(auth, resource.venueId);
  return dayOf(auth, resource, venue, date);
}

async function dayOf(
  auth: AuthContext,
  resource: Resource,
  venue: Venue,
  date: string,
): Promise<Day> {
  const resourceId = resource.id;
  const weekday = weekdayOf(date);
  const opening = venue.openingHours.find((day) => day.weekday === weekday);
  const wholeDay = {
    startsAt: instantAt(date, 0, venue.timeZone),
    endsAt: instantAt(date, MINUTES_PER_DAY, venue.timeZone),
  };
  const [rules, closed, blocks, bookings] = await Promise.all([
    priceRulesService.forResource(auth, resourceId),
    closedDatesService.isClosed(auth, venue.id, date),
    blockedTimesService.overlapping(auth, resourceId, wholeDay),
    bookingsRepository.listHolding(auth.tenantId, resourceId, wholeDay),
  ]);
  return {
    resourceId,
    date,
    timeZone: venue.timeZone,
    bookable: resource.active && venue.active,
    hours: opening && { opens: minuteOfDay(opening.opens), closes: minuteOfDay(opening.closes) },
    slotMinutes: resource.slotMinutes,
    intervalMinutes: resource.startIntervalMinutes,
    defaultPrice: resource.price,
    rules: rules
      .filter((rule) => rule.weekdays.includes(weekday))
      .map((rule) => ({
        startMinute: minuteOfDay(rule.startTime),
        endMinute: minuteOfDay(rule.endTime),
        price: rule.price,
      })),
    closed,
    blocked: blocks,
    booked: bookings,
    limitedToHorizon: auth.actor !== "staff",
  };
}

/** D-05, D-20: on the clock every Start Interval, from opening time, while `length` fits before closing. */
export function startMinutes(day: Day, length = day.slotMinutes): number[] {
  if (!day.hours) return [];
  const { opens, closes } = day.hours;
  const starts: number[] = [];
  const first = Math.ceil(opens / day.intervalMinutes) * day.intervalMinutes;
  for (let start = first; start + length <= closes; start += day.intervalMinutes)
    starts.push(start);
  return starts;
}

/** D-05: each Start Interval part costs its share of the slot price in force then. */
function priceOf(day: Day, start: number, end: number): Money {
  let centsTimesMinutes = 0;
  for (let part = start; part < end; part += day.intervalMinutes) {
    const rule = day.rules.find((r) => r.startMinute <= part && part < r.endMinute);
    centsTimesMinutes += (rule?.price ?? day.defaultPrice).amount * day.intervalMinutes;
  }
  const rupees = Math.round(centsTimesMinutes / day.slotMinutes / CENTS_PER_RUPEE);
  return { amount: rupees * CENTS_PER_RUPEE, currency: day.defaultPrice.currency };
}

/**
 * BKG-01: the time from `start` to `end` minutes into the day, its price, and whether it can
 * be booked. The free-slots list and booking both use this, so they never disagree.
 */
export function quote(day: Day, start: number, end: number, now = new Date()): Slot {
  const startsAt = instantAt(day.date, start, day.timeZone);
  const endsAt = instantAt(day.date, end, day.timeZone);
  const fits =
    startMinutes(day).includes(start) &&
    end > start &&
    (end - start) % day.slotMinutes === 0 &&
    end <= day.hours!.closes;
  const lastBookableDate = addDays(todayIn(day.timeZone, now), BOOKING_HORIZON_DAYS);
  const free =
    fits &&
    day.bookable &&
    !day.closed &&
    startsAt > now &&
    (!day.limitedToHorizon || day.date <= lastBookableDate) &&
    ![...day.blocked, ...day.booked].some(
      (taken) => taken.startsAt < endsAt && taken.endsAt > startsAt,
    );
  return { resourceId: day.resourceId, startsAt, endsAt, price: priceOf(day, start, end), free };
}

async function everyPage<T>(list: (page: PageRequest<"createdAt">) => Promise<Page<T>>) {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const result = await list({
      page,
      size: MAX_PAGE_SIZE,
      sort: { field: "createdAt", direction: "asc" },
    });
    items.push(...result.content);
    if (page + 1 >= result.totalPages) return items;
  }
}

/** With `resourceId`, that resource as before; otherwise every bookable one the caller may see. */
async function resourcesFor(
  auth: AuthContext,
  { resourceId, venueId, type }: AvailabilityFilters,
): Promise<{ resource: Resource; venue: Venue }[]> {
  if (resourceId !== undefined) {
    const resource = await resourcesService.get(auth, resourceId);
    const venue = await venuesService.get(auth, resource.venueId);
    const matches =
      (venueId === undefined || venueId === venue.id) &&
      (type === undefined || type === resource.type);
    return matches ? [{ resource, venue }] : [];
  }
  const [resources, venues] = await Promise.all([
    everyPage((page) => resourcesService.list(auth, { filters: { venueId, active: true }, page })),
    everyPage((page) => venuesService.list(auth, { filters: { active: true }, page })),
  ]);
  const openVenues = new Map(venues.map((venue) => [venue.id, venue]));
  return resources.flatMap((resource) => {
    const venue = openVenues.get(resource.venueId);
    return venue && (type === undefined || type === resource.type) ? [{ resource, venue }] : [];
  });
}

function slotsOf(day: Day, { slots = 1, from, to, free }: AvailabilityFilters, now: Date) {
  const length = slots * day.slotMinutes;
  const first = from === undefined ? 0 : minuteOfDay(from);
  const last = to === undefined ? MINUTES_PER_DAY : minuteOfDay(to);
  return startMinutes(day, length)
    .filter((start) => first <= start && start < last)
    .map((start) => quote(day, start, start + length, now))
    .filter((slot) => free === undefined || slot.free === free);
}

/** BKG-01: sorted by start, then resource, and paged over every resource at once. */
export async function list(
  auth: AuthContext,
  { filters, page }: ListQuery<AvailabilityFilters, AvailabilitySort>,
): Promise<Page<Slot>> {
  const now = new Date();
  const days = await Promise.all(
    (await resourcesFor(auth, filters)).map(({ resource, venue }) =>
      dayOf(auth, resource, venue, filters.date),
    ),
  );
  const slots = days
    .flatMap((day) => slotsOf(day, filters, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.resourceId - b.resourceId);
  if (page.sort.direction === "desc") slots.reverse();
  const first = page.page * page.size;
  return {
    content: slots.slice(first, first + page.size),
    page: page.page,
    size: page.size,
    totalElements: slots.length,
    totalPages: Math.ceil(slots.length / page.size),
  };
}
