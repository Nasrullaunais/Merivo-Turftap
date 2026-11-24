/** A date the venue's clock shows, such as "2026-12-25", needs no time zone of its own. */
const onDate = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );
const clock = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));

const fullDate = onDate({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDate = onDate({ weekday: "short", day: "numeric", month: "short" });
const dayAndMonth = onDate({ day: "numeric", month: "short" });
const dayMonthAndYear = onDate({ day: "numeric", month: "short", year: "numeric" });

const states = {
  AWAITING_PAYMENT: "Waiting for payment",
  AWAITING_CHECK: "Waiting for receipt check",
  CONFIRMED: "Confirmed",
  BLOCKED: "Blocked",
};

export default {
  title: "Calendar",
  loading: "Loading the calendar",
  noVenues: "No venues yet.",
  noResources: "No resources at this venue yet.",
  venueLabel: "Venue",
  resourceLabel: "Resource",
  viewLabel: "View",
  day: "Day",
  week: "Week",
  today: "Today",
  previous: { day: "Previous day", week: "Previous week" },
  next: { day: "Next day", week: "Next week" },
  /** "Fri, 25 Dec 2026", or "21 Dec – 27 Dec 2026" for a week. */
  heading: (first: string, last: string) =>
    first === last ? fullDate(first) : `${dayAndMonth(first)} – ${dayMonthAndYear(last)}`,
  dayColumn: shortDate,
  timeZone: (timeZone: string) => `Venue time (${timeZone})`,
  closed: "Closed",
  legend: "What the colours mean",
  states,
  /** "19:00–20:00" on the venue's clock. */
  window: (startsAt: string, endsAt: string, timeZone: string) =>
    `${clock(startsAt, timeZone)}–${clock(endsAt, timeZone)}`,
  /** "Free: Court 1, Fri 25 Dec, 19:00", where the column is "Fri 25 Dec". */
  freeSlot: (where: string, time: string) => `Free: ${where}, ${time}`,
  /** Shown on a free slot under the pointer. */
  freeSlotHint: (time: string) => `+ ${time}`,
};
