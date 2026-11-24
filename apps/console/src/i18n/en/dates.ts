const onDate = (options: Intl.DateTimeFormatOptions) => (date: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(
    new Date(`${date}T00:00:00Z`),
  );

export default {
  /** "2026-12-25" as the pieces of a tear-off calendar page: "Fri", "25", "Dec". */
  weekday: onDate({ weekday: "short" }),
  day: onDate({ day: "numeric" }),
  month: onDate({ month: "short" }),
};
