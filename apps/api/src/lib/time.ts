const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Today's date in a time zone, such as "2026-12-25". The en-CA format is already YYYY-MM-DD. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

const midnightUtc = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
};

/** "2026-12-25" plus 3 days is "2026-12-28". */
export const addDays = (date: string, days: number) =>
  new Date(midnightUtc(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

/** Monday is 1 and Sunday is 7, like `Weekday` in the contract. */
export const weekdayOf = (date: string) => new Date(midnightUtc(date)).getUTCDay() || 7;

/** How far the time zone's clocks are ahead of UTC at this instant. */
function offsetMs(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  const wallClock = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wallClock - Math.floor(instant / 1000) * 1000;
}

/** The instant a wall clock in the time zone shows `minute` minutes into `date`. 1440 is the next midnight. */
export function instantAt(date: string, minute: number, timeZone: string): Date {
  const wallClock = midnightUtc(date) + minute * MS_PER_MINUTE;
  const guess = wallClock - offsetMs(wallClock, timeZone);
  return new Date(wallClock - offsetMs(guess, timeZone));
}

/** "Fri 25 Dec, 10:00", in the venue's own time zone. */
export const describeInstant = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);

/** The venue's date and minutes into that day at this instant, the inverse of `instantAt`. */
export function wallClockAt(instant: Date, timeZone: string): { date: string; minute: number } {
  const shifted = instant.getTime() + offsetMs(instant.getTime(), timeZone);
  const date = new Date(shifted).toISOString().slice(0, 10);
  return { date, minute: Math.floor((shifted - midnightUtc(date)) / MS_PER_MINUTE) };
}

/** "Tue, 1 Dec 2026", for a calendar date such as a membership's start. */
export const describeDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(midnightUtc(date));
