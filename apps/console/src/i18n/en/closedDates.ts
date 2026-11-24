const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const clock = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

export default {
  title: "Closed Dates",
  loading: "Loading Closed Dates",
  none: "No upcoming Closed Dates.",
  noReason: "Closed all day",
  /** "2026-12-25" as "Fri, 25 Dec 2026". */
  day: (date: string) => DATE_FORMAT.format(new Date(`${date}T00:00:00Z`)),
  reopen: "Reopen",
  reopenFor: (day: string) => `Reopen ${day}`,
  addTitle: "Close the venue for a day",
  dateLabel: "Date",
  reasonLabel: "Reason customers see (optional)",
  submit: "Close this date",
  affectedTitle: (count: number, day: string) =>
    count === 1
      ? `1 booking on ${day} still holds its slots`
      : `${count} bookings on ${day} still hold their slots`,
  affectedHint:
    "Closing the venue doesn't cancel them. Contact these customers yourself, then close the date.",
  /** "19:00–20:00" on the venue's clock. */
  bookingTime: (startsAt: string, endsAt: string, timeZone: string) =>
    `${clock(timeZone).format(new Date(startsAt))}–${clock(timeZone).format(new Date(endsAt))}`,
  affectedListLabel: "Bookings on that date",
  closeAnyway: "Close anyway",
  goBack: "Go back",
};
