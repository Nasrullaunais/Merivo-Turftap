import { Spinner } from "@heroui/react";
import type { Booking, Venue } from "@turftap/contract/client";
import { useState } from "react";

import m from "../../i18n/en/calendar";
import { addDays, type CalendarView, datesShown, layOut, onVenueClock } from "./calendarGrid";
import { CalendarGrid, type SlotPress } from "./CalendarGrid";
import { CalendarToolbar } from "./CalendarToolbar";
import { StateLegend } from "./StateIcon";
import { useCalendar, useCalendarVenues } from "./useCalendar";

const DAYS_PER_WEEK = 7;

/** T18 and T19 open the walk-in form and the booking details from these. */
type Props = { onSlotPress?: SlotPress; onBookingPress?: (booking: Booking) => void };

/** BKG-05: a day or week of one venue's bookings, kept fresh by live updates. */
export function BookingCalendar(props: Props) {
  const { data: venues, isPending } = useCalendarVenues();
  const [venueId, setVenueId] = useState<number>();
  const venue = venues?.find((each) => each.id === venueId) ?? venues?.[0];

  if (isPending) return <Spinner aria-label={m.loading} />;
  if (!venues || !venue) return <p className="text-muted">{m.noVenues}</p>;
  return (
    <VenueCalendar
      key={venue.id}
      {...props}
      venues={venues}
      venue={venue}
      onVenueChange={setVenueId}
    />
  );
}

function VenueCalendar({
  venues,
  venue,
  onVenueChange,
  ...handlers
}: Props & { venues: Venue[]; venue: Venue; onVenueChange: (id: number) => void }) {
  const today = () => onVenueClock(new Date(), venue.timeZone).date;
  const [view, setView] = useState<CalendarView>("day");
  const [date, setDate] = useState(today);
  const [resourceId, setResourceId] = useState<number>();
  const dates = datesShown(view, date);
  const { isPending, resources, ...shown } = useCalendar(venue, dates);
  const weekResource = resources.find((each) => each.id === resourceId) ?? resources[0];
  const resourcesShown = view === "day" ? resources : resources.filter((r) => r === weekResource);
  const layout = layOut({ venue, dates, resources: resourcesShown, ...shown });

  return (
    <div className="grid gap-4">
      <CalendarToolbar
        venues={venues}
        venue={venue}
        onVenueChange={onVenueChange}
        view={view}
        onViewChange={setView}
        resources={resources}
        resourceId={weekResource?.id}
        onResourceChange={setResourceId}
        onMove={(steps) => setDate(addDays(date, steps * (view === "day" ? 1 : DAYS_PER_WEEK)))}
        onToday={() => setDate(today())}
      />
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{m.heading(dates[0]!, dates.at(-1)!)}</h2>
        <p className="text-sm text-muted">{m.timeZoneHint(venue.timeZone)}</p>
      </div>
      <StateLegend />
      {isPending && <Spinner aria-label={m.loading} />}
      {!isPending && resources.length === 0 && <p className="text-muted">{m.noResources}</p>}
      {!isPending && resources.length > 0 && (
        <CalendarGrid view={view} timeZone={venue.timeZone} {...layout} {...handlers} />
      )}
    </div>
  );
}
