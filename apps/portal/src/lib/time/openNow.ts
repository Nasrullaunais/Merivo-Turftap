import type { OpeningHours } from "@turftap/contract/client";
import { onVenueClock, weekdayOf } from "@turftap/ui";

const MINUTES_PER_HOUR = 60;

/** Whether the venue is open at `now` on its own clock, and when that changes today. */
export type OpenNow =
  { kind: "open"; closes: string } | { kind: "opensLater"; opens: string } | { kind: "closed" };

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * MINUTES_PER_HOUR + minutes;
};

export function openNow(hours: readonly OpeningHours[], timeZone: string, now: number): OpenNow {
  const { date, minute } = onVenueClock(new Date(now), timeZone);
  const today = hours.find((day) => day.weekday === weekdayOf(date));
  if (!today || minute >= minutesOf(today.closes)) return { kind: "closed" };
  if (minute < minutesOf(today.opens)) return { kind: "opensLater", opens: today.opens };
  return { kind: "open", closes: today.closes };
}
