const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/** "4 min", "2 h", "3 days": how long a receipt has waited. */
const waited = (since: string, now: Date) => {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / MINUTE_MS));
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours} h`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  return days === 1 ? "1 day" : `${days} days`;
};

const longDate = (localDate: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${localDate}T00:00:00Z`));

export default {
  title: "Receipt checks",
  waiting: "Waiting for a check",
  loading: "Loading receipts",
  empty: "No receipts waiting.",
  waited: (since: string, now: Date) => `Waiting ${waited(since, now)}`,
  receipt: "Transfer Receipt",
  openReceipt: "Open full size",
  noReceipt: "The receipt file is missing.",
  reading: "What the AI read",
  stillReading: "The AI is still reading this receipt.",
  unreadable: "Couldn't read this receipt",
  amountDue: "Amount due",
  amountRead: "Amount read",
  paidOn: "Paid on",
  bank: "Bank",
  reference: "Reference",
  notRead: "—",
  date: longDate,
  flags: {
    amountMatches: { yes: "Matches the amount due", no: "Doesn't match the amount due" },
    dateRecent: { yes: "Recent date", no: "Date isn't recent" },
    referenceNew: { yes: "New reference", no: "Reference used before" },
  },
  reused: "This receipt was used before",
  openEarlier: "Open the earlier booking",
  earlierBooking: "Earlier booking",
  accept: "Accept",
  reject: "Reject",
  rejectReceipt: "Reject receipt",
  keep: "Keep it",
  reasonLabel: "Reason",
  customerTold: "The customer gets the reason on WhatsApp.",
  decisions: "Decision",
};
