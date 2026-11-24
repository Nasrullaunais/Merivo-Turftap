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
  price: "Price",
  paid: "Paid",
  balance: "Balance",
  cancelReason: "Reason for cancelling",
  payments: "Payments",
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
  keep: "Keep it",
  amountLabel: "Amount (LKR)",
  noteLabel: "Note",
  reasonLabel: "Reason",
  customerTold: "The customer gets the reason on WhatsApp.",
};
