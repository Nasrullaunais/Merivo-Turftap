const day = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const clock = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

export default {
  title: "Blocked Times",
  loading: "Loading Blocked Times",
  none: "Nothing blocked. Every slot in opening hours can be booked.",
  /** "Fri, 25 Dec 2026 · 10:00–12:00", or both days when it runs past midnight. */
  window: (startsAt: string, endsAt: string, timeZone: string) => {
    const [start, end] = [new Date(startsAt), new Date(endsAt)];
    const [startDay, endDay] = [day(timeZone).format(start), day(timeZone).format(end)];
    const [from, to] = [clock(timeZone).format(start), clock(timeZone).format(end)];
    return startDay === endDay
      ? `${startDay} · ${from}–${to}`
      : `${startDay} ${from} – ${endDay} ${to}`;
  },
  unblock: "Unblock",
  unblockFor: (window: string) => `Unblock ${window}`,
  addTitle: "Block this resource",
  addHint: (timeZone: string) => `Times are in the venue's time zone (${timeZone}).`,
  startDateLabel: "From date",
  startTimeLabel: "From time",
  endDateLabel: "To date",
  endTimeLabel: "To time",
  endBeforeStart: "Must end after it starts",
  reasonLabel: "Reason (optional)",
  submit: "Block",
};
