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

const isoDate = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone });
const shortDay = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" });

export default {
  title: "Blocked Times",
  loading: "Loading Blocked Times",
  none: "Nothing blocked.",
  /** The venue's date the block starts on, such as "2026-12-25". */
  startDate: (startsAt: string, timeZone: string) => isoDate(timeZone).format(new Date(startsAt)),
  /** "10:00–12:00", or "10:00 – Sat 26 Dec, 08:00" when it ends on a later day. */
  hours: (startsAt: string, endsAt: string, timeZone: string) => {
    const [start, end] = [new Date(startsAt), new Date(endsAt)];
    const [from, to] = [clock(timeZone).format(start), clock(timeZone).format(end)];
    const sameDay = isoDate(timeZone).format(start) === isoDate(timeZone).format(end);
    return sameDay ? `${from}–${to}` : `${from} – ${shortDay(timeZone).format(end)}, ${to}`;
  },
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
  timeZone: (timeZone: string) => `Venue time (${timeZone})`,
  startDateLabel: "From date",
  startTimeLabel: "From time",
  endDateLabel: "To date",
  endTimeLabel: "To time",
  endBeforeStart: "Must end after it starts",
  reasonLabel: "Reason (optional)",
  submit: "Block",
};
