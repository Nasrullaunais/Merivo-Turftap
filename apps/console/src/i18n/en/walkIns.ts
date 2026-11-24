const clock = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
const shortDate = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(instant));
const onDate = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );
const dayOf = onDate({ weekday: "short", day: "numeric", month: "short" });

export default {
  title: "Walk-in booking",
  loading: "Loading the slot",
  /** "Fri 25 Dec, 19:00–21:00" on the venue's clock. */
  when: (startsAt: string, endsAt: string, timeZone: string) =>
    `${shortDate(startsAt, timeZone)}, ${clock(startsAt, timeZone)}–${clock(endsAt, timeZone)}`,
  phoneLabel: "Phone number",
  phoneInvalid: "Enter a phone number like 077 123 4567",
  nameLabel: "Name",
  existingCustomer: "Already a customer",
  slotsLabel: "Slots",
  paymentLabel: "Payment",
  payments: { CASH: "Paid in cash", PAY_LATER: "Pay later" },
  price: "Price",
  balance: "Balance",
  notBookable: "This time can't be booked. Pick a free slot.",
  submit: "Book",
  repeatLabel: "Repeat every week",
  weeksLabel: "Weeks",
  /** "Fri 25 Dec – Fri 12 Feb", the first and last week of a Repeat Series. */
  weekRange: (first: string, last: string) => `${dayOf(first)} – ${dayOf(last)}`,
  bookWeeks: (weeks: number) => `Book ${weeks} weeks`,
  clashTitle: (count: number) => (count === 1 ? "1 week isn't free" : `${count} weeks aren't free`),
  clashList: "Weeks that aren't free",
  fullDate: onDate({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  /** "3 of 4 weeks are free" */
  freeOf: (free: number, weeks: number) => `${free} of ${weeks} weeks are free`,
  skipAndBook: (free: number) =>
    free === 1 ? "Skip and book 1 week" : `Skip and book ${free} weeks`,
  cancelClash: "Cancel",
};
