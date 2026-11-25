import type { CheckInRefusal } from "@turftap/contract";

const onDate = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );
const weekdayDayMonth = onDate({ weekday: "short", day: "numeric", month: "short" });
const dayMonthYear = onDate({ day: "numeric", month: "short", year: "numeric" });

/** "07:12" on the venue's clock. */
const clock = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));

export default {
  clock,
  title: "Check-ins",
  searchLabel: "Phone or name",
  venueLabel: "Venue",
  searching: "Finding customers",
  matches: "Customers found",
  noCustomer: "No customer matches this.",
  noMembership: "No membership at this venue.",
  sell: "Sell a membership",
  clear: "Find someone else",
  memberships: (name: string) => `${name}'s memberships`,
  loadingMemberships: "Loading memberships",
  checkIn: "Check in",
  checkInAgain: "Check in again",
  /** Shown once the customer is in: "In at 07:12". */
  inAt: (time: string) => `In at ${time}`,
  /** At a venue that allows one a day, after the customer came in. */
  inToday: (time: string) => `In today at ${time}`,
  lastIn: (time: string) => `Last in at ${time}`,
  refusals: {
    NOT_PAID: "Not paid yet",
    BALANCE_OWED: "Balance owed",
    NOT_STARTED: "Not started yet",
    ENDED: "Ended",
    CANCELLED: "Cancelled",
  } satisfies Record<CheckInRefusal, string>,
  receiptWaiting: "Receipt waiting for a check",
  owes: "Owes",
  startsOn: (date: string) => `Starts ${weekdayDayMonth(date)}`,
  endedOn: (date: string) => `Ended ${dayMonthYear(date)}`,
  takeCash: "Take cash",
  amountLabel: "Amount (LKR)",
  recordCash: "Record cash",
  today: "Today",
  loadingToday: "Loading today's check-ins",
  noneToday: "No check-ins yet today.",
  /** The count under "Today", such as "12 in". */
  inCount: (count: number) => `${count} in`,
  undo: (name: string) => `Undo ${name}'s check-in`,
  undoShort: "Undo",
  settings: {
    title: "Check-ins",
    repeatLabel: "Allow more than one check-in a day",
    repeats: "A membership can be checked in more than once a day.",
    onceADay: "A membership can be checked in once a day.",
    saved: "Saved",
  },
};
