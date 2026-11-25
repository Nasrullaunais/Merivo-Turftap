import type { MembershipStatus, WalkInPayment } from "@turftap/contract";

const onDate = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );
const dayMonth = onDate({ day: "numeric", month: "short" });
const dayMonthYear = onDate({ day: "numeric", month: "short", year: "numeric" });
const weekdayDayMonth = onDate({ weekday: "short", day: "numeric", month: "short" });
const yearOf = (date: string) => date.slice(0, 4);

const days = (count: number) => (count === 1 ? "1 day" : `${count} days`);

export default {
  title: "Memberships",
  loading: "Loading memberships",
  byState: "Memberships by state",
  all: "All memberships",
  active: "Active",
  waiting: "Waiting for payment",
  /** The hint under the waiting tile: how many of them have a receipt to check. */
  toCheck: (count: number) => `${count} with a receipt to check`,
  finished: "Ended or cancelled",
  search: "Search",
  /** "3 of 12 memberships" */
  shownOf: (shown: number, total: number) => `${shown} of ${total} memberships`,
  /** The list holds the newest page only; said so rather than cut silently. */
  newestOnly: (shown: number, total: number) => `Showing the newest ${shown} of ${total}`,
  none: "No memberships yet.",
  noMatches: "No memberships match.",
  noPlans: "Add a Membership Plan first.",
  openPlans: "Membership Plans",
  states: {
    AWAITING_PAYMENT: "Waiting for payment",
    AWAITING_CHECK: "Waiting for receipt check",
    ACTIVE: "Active",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
    ENDED: "Ended",
  } satisfies Record<MembershipStatus, string>,
  /** "15 Jan – 14 Feb 2027", or with both years when they differ. */
  range: (first: string, last: string) =>
    yearOf(first) === yearOf(last)
      ? `${dayMonth(first)} – ${dayMonthYear(last)}`
      : `${dayMonthYear(first)} – ${dayMonthYear(last)}`,
  /** "Sat 15 Jan → Mon 14 Feb", the days a sale covers. */
  runs: (first: string, last: string) => `${weekdayDayMonth(first)} → ${weekdayDayMonth(last)}`,
  length: (count: number) => days(count),
  daysLeft: (count: number) => (count === 0 ? "Last day" : `${days(count)} left`),
  startsIn: (count: number) => (count === 1 ? "Starts tomorrow" : `Starts in ${days(count)}`),
  used: "Days used",
  balance: "Balance",
  paid: "Paid",
  price: "Price",
  sell: "Sell a membership",
  phoneLabel: "Phone number",
  phoneInvalid: "Enter a phone number like 077 123 4567",
  nameLabel: "Name",
  existingCustomer: "Already a customer",
  venueLabel: "Venue",
  planLabel: "Plan",
  noPlansAtVenue: "No plans on sale at this venue.",
  startLabel: "Starts on",
  startInPast: "Pick today or a later date",
  paymentLabel: "Payment",
  payments: { CASH: "Paid in cash", PAY_LATER: "Pay later" } satisfies Record<
    WalkInPayment,
    string
  >,
  /** MEM-04: the start the server will move to, so the desk can say it. */
  renews: (currentLastDay: string) =>
    `Renewal: the current one ends ${weekdayDayMonth(currentLastDay)}`,
  submit: "Sell membership",
  customerTold: "The customer gets the dates on WhatsApp.",
};
