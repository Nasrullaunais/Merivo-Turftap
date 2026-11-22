/** Today's date in a time zone, such as "2026-12-25". The en-CA format is already YYYY-MM-DD. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}
