const MS_PER_DAY = 86_400_000;
const MINUTES_PER_HOUR = 60;
const SUNDAY = 7;

/** The date and minute of the day an instant shows on the venue's clock. */
export function onVenueClock(instant: string | Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute: Number(parts.hour) * MINUTES_PER_HOUR + Number(parts.minute),
  };
}

export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);

/** Monday is 1 and Sunday is 7, as in a venue's opening hours. */
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() || SUNDAY;
