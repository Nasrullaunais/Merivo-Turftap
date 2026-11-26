/** "6:30 PM", kept on one line: customers read 12-hour times more easily than 24-hour ones. */
const clock = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(instant))
    .replace(/\s/u, "\u00a0");
/** A LocalDate is the venue's own date, so it is read as UTC to keep the day it names. */
const onDate = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );

export default {
  loading: "Loading free times",
  dayTitle: "Pick a day",
  timeTitle: "Pick a time",
  today: "Today",
  weekday: onDate({ weekday: "short" }),
  dayOfMonth: onDate({ day: "numeric" }),
  month: onDate({ month: "short" }),
  /** "Friday 27 November" */
  fullDate: onDate({ weekday: "long", day: "numeric", month: "long" }),
  /** "Fri 27 Nov" */
  shortDate: onDate({ weekday: "short", day: "numeric", month: "short" }),
  earlier: "Earlier days",
  later: "Later days",
  clock,
  /** "6:00 PM – 8:00 PM" on the venue's clock. */
  range: (startsAt: string, endsAt: string, timeZone: string) =>
    `${clock(startsAt, timeZone)} – ${clock(endsAt, timeZone)}`,
  partsOfDay: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
  taken: "Taken",
  /** "6:00 PM, LKR 4,500" or "7:00 PM, Taken", as a screen reader says a slot. */
  slotLabel: (time: string, detail: string) => `${time}, ${detail}`,
  freeCount: (count: number) => (count === 1 ? "1 free" : `${count} free`),
  fullyBooked: "Fully booked",
  closed: "Closed",
  closedNoReason: "The venue is closed on this day.",
  closedChip: "Closed",
  notOpen: {
    title: "Not open on this day",
    body: "Pick another day to see free times.",
  },
  noneLeft: {
    title: "No more times today",
    body: "Today's slots have all started. Pick another day.",
  },
  pickHint: "Tap the time you want to start.",
  yourTime: "Your time",
  /** "Shorter by 1 hour" */
  shorter: (step: string) => `Shorter by ${step}`,
  longer: (step: string) => `Longer by ${step}`,
  tapToGrow: "Tap + to play longer.",
  nextNotFree: "The time right after isn't free.",
  /** "3 hours is the longest you can book online." */
  longestOnline: (length: string) => `${length} is the longest you can book online.`,
  book: "Book",
  clear: "Clear",
};
