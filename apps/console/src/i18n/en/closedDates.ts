const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default {
  title: "Closed Dates",
  loading: "Loading Closed Dates",
  none: "No upcoming Closed Dates. The venue follows its opening hours every day.",
  /** "2026-12-25" as "Fri, 25 Dec 2026". */
  day: (date: string) => DATE_FORMAT.format(new Date(`${date}T00:00:00Z`)),
  reopen: "Reopen",
  reopenFor: (day: string) => `Reopen ${day}`,
  addTitle: "Close the venue for a day",
  dateLabel: "Date",
  reasonLabel: "Reason customers see (optional)",
  submit: "Close this date",
};
