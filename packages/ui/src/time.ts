const MS_PER_MINUTE = 60_000;

/** How far a time zone's wall clock is ahead of UTC at one instant, in milliseconds. */
function offsetAt(instant: number, timeZone: string) {
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
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  );
  const wall = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!);
  return wall - Math.floor(instant / MS_PER_MINUTE) * MS_PER_MINUTE;
}

/**
 * The instant a venue's clock shows `date` ("2026-12-25") and `time` ("10:00").
 * The offset is looked up twice so a summer-time change on that day is handled.
 */
export function instantInZone(date: string, time: string, timeZone: string): Date {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const guess = wall - offsetAt(wall, timeZone);
  return new Date(wall - offsetAt(guess, timeZone));
}
