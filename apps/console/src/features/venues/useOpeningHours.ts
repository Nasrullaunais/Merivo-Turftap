import type { OpeningHours } from "@turftap/contract";
import { useState } from "react";

export type DayHours = { weekday: number; open: boolean; opens: string; closes: string };

const DEFAULT_OPENS = "06:00";
const DEFAULT_CLOSES = "22:00";
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const everyDayOpen = (): DayHours[] =>
  WEEKDAYS.map((weekday) => ({
    weekday,
    open: true,
    opens: DEFAULT_OPENS,
    closes: DEFAULT_CLOSES,
  }));

/** One row per weekday; days that aren't open are left out of what the API gets. */
export function useOpeningHours() {
  const [days, setDays] = useState(everyDayOpen);

  const change = (weekday: number, fields: Partial<DayHours>) =>
    setDays((current) =>
      current.map((day) => (day.weekday === weekday ? { ...day, ...fields } : day)),
    );

  const openingHours: OpeningHours[] = days
    .filter((day) => day.open)
    .map(({ weekday, opens, closes }) => ({ weekday, opens, closes }));

  return { days, change, openingHours, reset: () => setDays(everyDayOpen()) };
}
