import { HOLDING_STATUSES, minuteOfDay, type OpeningHours } from "@turftap/contract";
import type { BlockedTime, Booking, ClosedDate, Resource, Venue } from "@turftap/contract/client";

import { addDays, onVenueClock, weekdayOf } from "../../lib/time/venueClock";
import type { CalendarState } from "./calendarStates";

export { addDays, onVenueClock, weekdayOf };

const MINUTES_PER_DAY = 1440;
const DAYS_PER_WEEK = 7;

export type CalendarView = "day" | "week";

/** The dates a view shows: one day, or Monday to Sunday of that day's week. */
export function datesShown(view: CalendarView, date: string) {
  if (view === "day") return [date];
  const monday = addDays(date, 1 - weekdayOf(date));
  return Array.from({ length: DAYS_PER_WEEK }, (_, day) => addDays(monday, day));
}

export const hoursOn = (openingHours: OpeningHours[], date: string) =>
  openingHours.find((day) => day.weekday === weekdayOf(date));

/** The start minute of each row: from the earliest opening to the latest closing of the dates shown. */
export function rowStarts(hours: OpeningHours[], stepMinutes: number) {
  if (hours.length === 0) return [];
  const first = Math.min(...hours.map((day) => minuteOfDay(day.opens)));
  const last = Math.max(...hours.map((day) => minuteOfDay(day.closes)));
  const start = first - (first % stepMinutes);
  return Array.from(
    { length: Math.ceil((last - start) / stepMinutes) },
    (_, row) => start + row * stepMinutes,
  );
}

/** The rows a booking or Blocked Time covers on `date`, or nothing if it isn't on that day. */
export function rowsCovered(
  item: { startsAt: string; endsAt: string },
  date: string,
  rows: number[],
  stepMinutes: number,
  timeZone: string,
) {
  const start = onVenueClock(item.startsAt, timeZone);
  const end = onVenueClock(item.endsAt, timeZone);
  if (start.date > date || end.date < date) return undefined;
  const from = start.date < date ? 0 : start.minute;
  const to = end.date > date ? MINUTES_PER_DAY : end.minute;
  const covered = rows.flatMap((minute, row) =>
    minute < to && minute + stepMinutes > from ? [row] : [],
  );
  return covered.length > 0 ? { first: covered[0]!, last: covered.at(-1)! } : undefined;
}

/** One resource on one date: a resource per column in the day view, a date per column in the week view. */
export type Column = {
  resource: Resource;
  date: string;
  hours: OpeningHours | undefined;
  closedDate: ClosedDate | undefined;
};

type Item = {
  key: string;
  resourceId: number;
  startsAt: string;
  endsAt: string;
  state: CalendarState;
  booking?: Booking;
  reason?: string | null;
};

/** A booking or Blocked Time, placed in its column from row `first` to row `last`. */
export type Entry = Item & { column: number; first: number; last: number };

type Shown = {
  venue: Venue;
  resources: Resource[];
  dates: string[];
  bookings: Booking[];
  blocks: BlockedTime[];
  closedDates: ClosedDate[];
};

type HoldingStatus = (typeof HOLDING_STATUSES)[number];
const holdsItsSlots = (booking: Booking): booking is Booking & { status: HoldingStatus } =>
  (HOLDING_STATUSES as readonly string[]).includes(booking.status);

export const isOpen = (column: Column) => column.hours !== undefined && !column.closedDate;

/** Where everything goes: the columns, the start minute of each row, and each entry's rows. */
export function layOut({ venue, resources, dates, bookings, blocks, closedDates }: Shown) {
  const columns: Column[] = dates.flatMap((date) =>
    resources.map((resource) => ({
      resource,
      date,
      hours: hoursOn(venue.openingHours, date),
      closedDate: closedDates.find((closed) => closed.date === date),
    })),
  );
  const stepMinutes = Math.min(
    ...resources.flatMap((resource) => [resource.slotMinutes, resource.startIntervalMinutes]),
  );
  const rows = rowStarts(
    columns.flatMap((column) => (isOpen(column) ? [column.hours!] : [])),
    stepMinutes,
  );

  const items: Item[] = [
    ...bookings.filter(holdsItsSlots).map((booking) => ({
      key: `booking-${booking.id}`,
      resourceId: booking.resourceId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      state: booking.status,
      booking,
    })),
    ...blocks.map((block) => ({
      key: `block-${block.id}`,
      resourceId: block.resourceId,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      state: "BLOCKED" as const,
      reason: block.reason,
    })),
  ];
  const entries: Entry[] = columns.flatMap((column, index) =>
    items.flatMap((item) => {
      if (!isOpen(column) || item.resourceId !== column.resource.id) return [];
      const covered = rowsCovered(item, column.date, rows, stepMinutes, venue.timeZone);
      return covered ? [{ ...item, ...covered, column: index, key: `${item.key}-${index}` }] : [];
    }),
  );
  return { columns, rows, entries };
}

type Layout = ReturnType<typeof layOut>;

/** How many slot rows are open and how many of them hold a booking or Blocked Time. */
export function fullness({ columns, rows, entries }: Layout) {
  const open = columns.reduce((sum, column) => {
    if (!isOpen(column)) return sum;
    const [opens, closes] = [minuteOfDay(column.hours!.opens), minuteOfDay(column.hours!.closes)];
    return sum + rows.filter((minute) => minute >= opens && minute < closes).length;
  }, 0);
  const taken = entries.reduce((sum, entry) => sum + entry.last - entry.first + 1, 0);
  return { open, taken: Math.min(taken, open) };
}

/** Each state's number of bookings (or Blocked Times) among the entries, counted once each. */
export function countByState(entries: Entry[]) {
  const seen = new Map<string, CalendarState>();
  // An entry's key ends in its column; one booking or Blocked Time can span several columns.
  for (const entry of entries)
    seen.set(entry.key.slice(0, entry.key.lastIndexOf("-")), entry.state);
  const counts: Partial<Record<CalendarState, number>> = {};
  for (const state of seen.values()) counts[state] = (counts[state] ?? 0) + 1;
  return counts;
}
