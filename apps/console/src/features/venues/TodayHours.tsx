import type { Venue } from "@turftap/contract/client";
import { Clock } from "lucide-react";

import m from "../../i18n/en/venues";
import { useVenueToday } from "../../lib/time/useVenueToday";
import { weekdayOf } from "@turftap/ui";

/** Today's opening hours on the venue's own clock. */
export function TodayHours({ venue }: { venue: Venue }) {
  const today = weekdayOf(useVenueToday(venue.timeZone)!);
  const hours = venue.openingHours.find((day) => day.weekday === today);
  return (
    <span className="inline-flex items-center gap-1.5 text-muted tabular-nums">
      <Clock aria-hidden size={14} />
      {hours ? m.todayHours(hours.opens, hours.closes) : m.closedToday}
    </span>
  );
}
