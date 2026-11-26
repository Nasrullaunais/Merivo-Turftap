import { minuteOfDay } from "@turftap/contract";
import { Clock } from "lucide-react";

import { sweepIndex } from "../../components/look";
import { Section } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/venues";
import { useVenueToday } from "../../lib/time/useVenueToday";
import { weekdayOf } from "@turftap/ui";
import { useVenue } from "./useVenue";

const MINUTES_PER_DAY = 1440;

/** The venue's week at a glance: each day's hours as a bar across the day, today marked. */
export function OpeningHoursCard({ venueId }: { venueId: number }) {
  const { data: venue } = useVenue(venueId);
  const todayDate = useVenueToday(venue?.timeZone);
  const today = todayDate && weekdayOf(todayDate);

  return (
    <Section hue="plain" icon={Clock} title={m.hoursLabel}>
      {!venue && (
        <div className="p-3">
          <SkeletonRows label={m.loadingOne} rows={2} tile={false} />
        </div>
      )}
      {venue && (
        <ul className="grid gap-0.5 p-2 tt-sweep">
          {m.weekdays.map((day, index) => {
            const weekday = index + 1;
            const hours = venue.openingHours.find((each) => each.weekday === weekday);
            const isToday = weekday === today;
            return (
              <li
                key={day}
                style={sweepIndex(index)}
                className={`grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 rounded-lg px-2.5 py-2 text-sm ${isToday ? "bg-accent-soft font-medium text-accent-soft-foreground" : ""}`}
              >
                <span>{day}</span>
                <span aria-hidden className="relative h-1.5 rounded-full bg-[var(--tt-field)]">
                  {hours && (
                    <span
                      className={`absolute inset-y-0 rounded-full ${isToday ? "bg-accent" : "bg-[color-mix(in_oklab,var(--tt-hue-plain)_45%,transparent)]"}`}
                      style={{
                        insetInlineStart: `${(minuteOfDay(hours.opens) / MINUTES_PER_DAY) * 100}%`,
                        insetInlineEnd: `${100 - (minuteOfDay(hours.closes) / MINUTES_PER_DAY) * 100}%`,
                      }}
                    />
                  )}
                </span>
                <span className={`tabular-nums ${hours ? "" : "text-muted"}`}>
                  {hours ? `${hours.opens}–${hours.closes}` : m.closedDay}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
