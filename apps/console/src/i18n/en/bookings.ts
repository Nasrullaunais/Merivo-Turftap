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
const onDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));

export default {
  /** "Fri 25 Dec, 19:00–21:00" on the venue's clock. */
  when: (startsAt: string, endsAt: string, timeZone: string) =>
    `${shortDate(startsAt, timeZone)}, ${clock(startsAt, timeZone)}–${clock(endsAt, timeZone)}`,
  /** "Fri 25 Dec, 19:04", when a payment was recorded. */
  at: (instant: string, timeZone: string) =>
    `${shortDate(instant, timeZone)}, ${clock(instant, timeZone)}`,
  states: {
    AWAITING_PAYMENT: "Waiting for payment",
    AWAITING_CHECK: "Waiting for receipt check",
    CONFIRMED: "Confirmed",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
  },
  sources: { ONLINE: "Online", WALK_IN: "Walk-in" },
  weekly: "Every week",
  /** "Every week, 8 weeks from Fri 25 Dec": a booking's Repeat Series. */
  seriesLine: (weeks: number, firstDate: string) =>
    `Every week, ${weeks} weeks from ${onDate(firstDate)}`,
  seriesCancelled: "Series cancelled",
  price: "Price",
  paid: "Paid",
  balance: "Balance",
  cancelReason: "Reason for cancelling",
  payments: "Payments",
  loadingBooking: "Loading booking",
  loadingPayments: "Loading payments",
  noPayments: "No payments yet.",
  kinds: { TRANSFER: "Bank transfer", CASH: "Cash", REFUND: "Refund" },
  paymentStates: {
    PENDING_CHECK: "Waiting for check",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
  },
  actions: "What to do",
  recordCash: "Record cash",
  recordRefund: "Record refund",
  cancel: "Cancel booking",
  cancelSeries: "Cancel the rest of the series",
  keep: "Keep it",
  amountLabel: "Amount (LKR)",
  noteLabel: "Note",
  reasonLabel: "Reason",
  customerTold: "The customer gets the reason on WhatsApp.",
};
